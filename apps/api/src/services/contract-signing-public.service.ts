import PDFDocument from "pdfkit";
import { prisma } from "@bcp/database";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { generateOtpCode, isOtpValid } from "@bcp/gallery";
import { isReadyToFinalize, canRequestOtp } from "@bcp/contracts";
import { sendAuthEmail } from "./notify";
import { ContractNotFoundError } from "./contracts.service";

export class ContractOtpRequestNotAllowedError extends Error {
  readonly code = "CONTRACT_OTP_NOT_ALLOWED";
  constructor() {
    super("This contract can't be signed right now.");
    this.name = "ContractOtpRequestNotAllowedError";
  }
}

export class InvalidContractOtpError extends Error {
  readonly code = "INVALID_CONTRACT_OTP";
  constructor() {
    super("Incorrect or expired code.");
    this.name = "InvalidContractOtpError";
  }
}

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

async function logAudit(contractId: string, action: string, actorType: string, meta?: { ipAddress?: string; userAgent?: string; metadata?: Record<string, unknown> }) {
  await prisma.contractAuditLogEntry.create({ data: { contractId, action: action as never, actorType, ipAddress: meta?.ipAddress, userAgent: meta?.userAgent, metadata: meta?.metadata } });
}

async function resolveByToken(publicToken: string) {
  const contract = await prisma.clientContract.findUnique({ where: { publicToken } });
  if (!contract) throw new ContractNotFoundError();
  return contract;
}

export async function viewContract(publicToken: string, requestMeta: { ipAddress?: string; userAgent?: string }) {
  const contract = await resolveByToken(publicToken);
  const currentVersion = await prisma.contractVersion.findFirst({ where: { contractId: contract.id, versionNumber: contract.currentVersionNumber } });
  await logAudit(contract.id, "viewed", "client", requestMeta);
  return { contract, bodyHtml: currentVersion?.bodyHtml ?? "" };
}

/** "OTP verification" — requested against the client's own email, tied to this specific contract (not a general portal login), and only while the contract is genuinely awaiting signature. */
export async function requestSigningOtp(publicToken: string, requestMeta: { ipAddress?: string; userAgent?: string }) {
  const contract = await resolveByToken(publicToken);
  if (!canRequestOtp(contract.status)) throw new ContractOtpRequestNotAllowedError();

  const client = await prisma.client.findUniqueOrThrow({ where: { id: contract.clientId }, select: { email: true, name: true } });
  const code = generateOtpCode();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.clientContract.update({ where: { id: contract.id }, data: { signerOtpCode: code, signerOtpExpiresAt: otpExpiresAt, signerIpAddress: requestMeta.ipAddress, signerUserAgent: requestMeta.userAgent } });
  if (client.email) await sendAuthEmail({ to: client.email, subject: "Your contract signing code", html: `<p>Your code is <strong>${code}</strong>. It expires in 10 minutes.</p>` }).catch(() => undefined);

  await logAudit(contract.id, "otp_requested", "client", requestMeta);
  return { sent: Boolean(client.email) };
}

export async function verifySigningOtp(publicToken: string, code: string, requestMeta: { ipAddress?: string; userAgent?: string }) {
  const contract = await resolveByToken(publicToken);
  if (!isOtpValid(contract.signerOtpCode, contract.signerOtpExpiresAt, code)) throw new InvalidContractOtpError();

  await prisma.clientContract.update({ where: { id: contract.id }, data: { signerOtpVerifiedAt: new Date() } });
  await logAudit(contract.id, "otp_verified", "client", requestMeta);
  return { verified: true };
}

/** "Witness" — a separate signer with their own IP/timestamp captured independently of the client's own. */
export async function witnessSign(publicToken: string, witnessName: string, requestMeta: { ipAddress?: string; userAgent?: string }) {
  const contract = await resolveByToken(publicToken);
  await prisma.clientContract.update({ where: { id: contract.id }, data: { witnessName, witnessSignedAt: new Date(), witnessIpAddress: requestMeta.ipAddress } });
  await logAudit(contract.id, "witnessed", "witness", { ...requestMeta, metadata: { witnessName } });
  return { witnessed: true };
}

/**
 * The final signing step — only finalizes (`status: "signed"`) once
 * `isReadyToFinalize()` confirms OTP verification (and witness
 * signature, when required) both actually happened; a client typing
 * their name alone is never sufficient. Generates the PDF certificate
 * — the durable proof of IP address, timestamp, and OTP verification —
 * in the same step, not a follow-up a studio has to remember to
 * trigger.
 */
export async function signContract(publicToken: string, signedByName: string, requestMeta: { ipAddress?: string; userAgent?: string }) {
  const contract = await resolveByToken(publicToken);

  const readyCheck = { status: contract.status, witnessRequired: contract.witnessRequired, witnessSignedAt: contract.witnessSignedAt, signerOtpVerifiedAt: contract.signerOtpVerifiedAt };
  if (!isReadyToFinalize(readyCheck)) throw new Error("This contract isn't ready to be signed yet — verify with the code we sent you first.");

  const signedAt = new Date();
  await prisma.clientContract.update({ where: { id: contract.id }, data: { status: "signed", signedAt, signedByName, signerIpAddress: requestMeta.ipAddress ?? contract.signerIpAddress } });
  await logAudit(contract.id, "signed", "client", { ...requestMeta, metadata: { signedByName } });

  const certificateKey = await generateSigningCertificate(contract.id);
  return { signed: true, certificateKey };
}

/** "PDF certificate" — one document combining the signer's name/IP/timestamp/OTP-verification proof and, when applicable, the witness's own. */
async function generateSigningCertificate(contractId: string): Promise<string> {
  const contract = await prisma.clientContract.findUniqueOrThrow({ where: { id: contractId } });
  const client = await prisma.client.findUniqueOrThrow({ where: { id: contract.clientId }, select: { name: true } });
  const studio = await prisma.studio.findUniqueOrThrow({ where: { id: contract.studioId }, select: { name: true } });

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("Signing Certificate");
    doc.fontSize(11).fillColor("#666").text(`${studio.name} — ${contract.title}`);
    doc.fillColor("#000").moveDown();

    doc.fontSize(10).text(`Signed by: ${contract.signedByName ?? client.name}`);
    doc.text(`Signed at: ${contract.signedAt?.toISOString() ?? ""}`);
    doc.text(`Signer IP address: ${contract.signerIpAddress ?? "unknown"}`);
    doc.text(`OTP verified at: ${contract.signerOtpVerifiedAt?.toISOString() ?? "not verified"}`);
    doc.moveDown();

    if (contract.witnessRequired) {
      doc.fontSize(12).text("Witness", { underline: true });
      doc.fontSize(10).text(`Witness name: ${contract.witnessName ?? ""}`);
      doc.text(`Witness signed at: ${contract.witnessSignedAt?.toISOString() ?? "not signed"}`);
      doc.text(`Witness IP address: ${contract.witnessIpAddress ?? "unknown"}`);
    }

    doc.end();
  });

  const key = `contracts/${contractId}/certificate-${Date.now()}.pdf`;
  await getStorageClient().put(key, buffer, "application/pdf");
  await prisma.clientContract.update({ where: { id: contractId }, data: { certificateFileKey: key } });
  await logAudit(contractId, "certificate_generated", "studio", { metadata: { certificateKey: key } });
  return key;
}

export async function getCertificateUrl(studioId: string, contractId: string) {
  const contract = await prisma.clientContract.findFirst({ where: { id: contractId, studioId } });
  if (!contract?.certificateFileKey) throw new ContractNotFoundError();
  return getStorageClient().getSignedGetUrl(contract.certificateFileKey);
}
