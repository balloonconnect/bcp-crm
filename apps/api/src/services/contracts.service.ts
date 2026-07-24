import { prisma } from "@bcp/database";
import { renderContractSections, resolveNextVersionNumber, type ContractSection } from "@bcp/contracts";
import { ContractTemplateNotFoundError } from "./contract-templates.service";
import { recordActivity } from "./activity-log.service";

export class ContractNotFoundError extends Error {
  readonly code = "CONTRACT_NOT_FOUND";
  constructor() {
    super("Contract not found");
    this.name = "ContractNotFoundError";
  }
}

async function logAudit(contractId: string, action: string, actorType: string, meta?: { ipAddress?: string; userAgent?: string; metadata?: Record<string, unknown> }) {
  await prisma.contractAuditLogEntry.create({ data: { contractId, action: action as never, actorType, ipAddress: meta?.ipAddress, userAgent: meta?.userAgent, metadata: meta?.metadata } });
}

const contractInclude = { versions: { orderBy: { versionNumber: "desc" as const } }, auditLogEntries: { orderBy: { createdAt: "desc" as const } }, template: { select: { name: true } } };

export async function listContracts(studioId: string, clientId?: string) {
  return prisma.clientContract.findMany({ where: { studioId, ...(clientId ? { clientId } : {}) }, orderBy: { createdAt: "desc" } });
}

export async function getContract(studioId: string, contractId: string) {
  const contract = await prisma.clientContract.findFirst({ where: { id: contractId, studioId }, include: contractInclude });
  if (!contract) throw new ContractNotFoundError();
  return contract;
}

export interface CreateContractInput {
  title: string;
  clientId: string;
  templateId?: string;
  eventId?: string;
  variableValues?: Record<string, string>;
  witnessRequired?: boolean;
  witnessName?: string;
  witnessEmail?: string;
}

/**
 * Generates a contract from a studio's own template — "Variables" and
 * "Event details" are resolved in the same substitution pass
 * (`renderContractSections()`), and the very first `ContractVersion`
 * row is created in the same transaction as the contract itself, so a
 * contract never exists without at least one version snapshot to
 * point at.
 */
export async function createContract(studioId: string, input: CreateContractInput, actorId: string) {
  let bodyHtml = "";
  if (input.templateId) {
    const template = await prisma.contractTemplate.findFirst({ where: { id: input.templateId, studioId } });
    if (!template) throw new ContractTemplateNotFoundError();
    bodyHtml = renderContractSections(template.sections as unknown as ContractSection[], input.variableValues ?? {});
  }

  const contract = await prisma.$transaction(async (tx: typeof prisma) => {
    const created = await tx.clientContract.create({
      data: {
        studioId, clientId: input.clientId, eventId: input.eventId, title: input.title, templateId: input.templateId,
        variableValues: input.variableValues, witnessRequired: input.witnessRequired ?? false, witnessName: input.witnessName, witnessEmail: input.witnessEmail,
        createdBy: actorId,
      },
    });
    await tx.contractVersion.create({ data: { contractId: created.id, versionNumber: 1, bodyHtml, variableValues: input.variableValues, createdBy: actorId } });
    return created;
  });

  await logAudit(contract.id, "created", "studio", { metadata: { templateId: input.templateId } });
  return getContract(studioId, contract.id);
}

/** Editing a contract's content before sending creates a **new** version rather than overwriting the current one — "Version history" means every draft revision is preserved, not just the final signed text. */
export async function updateContractContent(studioId: string, contractId: string, bodyHtml: string, variableValues: Record<string, string> | undefined, actorId: string) {
  const contract = await prisma.clientContract.findFirst({ where: { id: contractId, studioId } });
  if (!contract) throw new ContractNotFoundError();

  const nextVersion = resolveNextVersionNumber(contract.currentVersionNumber);
  await prisma.$transaction([
    prisma.contractVersion.create({ data: { contractId, versionNumber: nextVersion, bodyHtml, variableValues, createdBy: actorId } }),
    prisma.clientContract.update({ where: { id: contractId }, data: { currentVersionNumber: nextVersion, variableValues } }),
  ]);

  await logAudit(contractId, "revision_requested", "studio", { metadata: { versionNumber: nextVersion } });
  return getContract(studioId, contractId);
}

export async function sendContract(studioId: string, contractId: string, actorId: string) {
  const contract = await prisma.clientContract.findFirst({ where: { id: contractId, studioId } });
  if (!contract) throw new ContractNotFoundError();

  await prisma.clientContract.update({ where: { id: contractId }, data: { status: "sent" } });
  await logAudit(contractId, "sent", "studio");
  await recordActivity({ studioId, actorId, action: "contract.sent", resourceType: "ClientContract", resourceId: contractId });
  return getContract(studioId, contractId);
}

export async function voidContract(studioId: string, contractId: string, actorId: string) {
  const contract = await prisma.clientContract.findFirst({ where: { id: contractId, studioId } });
  if (!contract) throw new ContractNotFoundError();

  await prisma.clientContract.update({ where: { id: contractId }, data: { status: "void" } });
  await logAudit(contractId, "voided", "studio");
  await recordActivity({ studioId, actorId, action: "contract.voided", resourceType: "ClientContract", resourceId: contractId });
  return getContract(studioId, contractId);
}

export { logAudit };
