import { prisma } from "@bcp/database";
import { recordActivity } from "./activity-log.service";

// ── Family contacts ──────────────────────────────────────────────────

export async function listFamilyContacts(studioId: string, clientId: string) {
  return prisma.clientFamilyContact.findMany({ where: { studioId, clientId }, orderBy: { createdAt: "asc" } });
}

export async function addFamilyContact(studioId: string, clientId: string, input: { name: string; relationship?: string; phone?: string; email?: string }, actorId: string) {
  const contact = await prisma.clientFamilyContact.create({ data: { studioId, clientId, ...input } });
  await recordActivity({ studioId, actorId, action: "client.family_contact_added", resourceType: "Client", resourceId: clientId, metadata: { name: input.name } });
  return contact;
}

export async function removeFamilyContact(studioId: string, contactId: string) {
  await prisma.clientFamilyContact.deleteMany({ where: { id: contactId, studioId } });
}

// ── Communications ───────────────────────────────────────────────────

export async function listClientCommunications(studioId: string, clientId: string) {
  return prisma.clientCommunication.findMany({ where: { studioId, clientId }, orderBy: { occurredAt: "desc" } });
}

export async function logClientCommunication(
  studioId: string,
  clientId: string,
  input: { channel: string; direction: string; summary: string; occurredAt: string },
  actorId: string,
) {
  const communication = await prisma.clientCommunication.create({
    data: { studioId, clientId, channel: input.channel as never, direction: input.direction as never, summary: input.summary, occurredAt: new Date(input.occurredAt), createdBy: actorId },
  });
  await recordActivity({ studioId, actorId, action: "client.communication_logged", resourceType: "Client", resourceId: clientId, metadata: { channel: input.channel } });
  return communication;
}

// ── Contracts ────────────────────────────────────────────────────────

export async function listContracts(studioId: string, clientId: string) {
  return prisma.clientContract.findMany({ where: { studioId, clientId }, orderBy: { createdAt: "desc" } });
}

export async function createContract(studioId: string, clientId: string, input: { title: string; eventId?: string }, actorId: string) {
  const contract = await prisma.clientContract.create({ data: { studioId, clientId, title: input.title, eventId: input.eventId, createdBy: actorId } });
  await recordActivity({ studioId, actorId, action: "contract.created", resourceType: "Client", resourceId: clientId, metadata: { title: input.title } });
  return contract;
}

export async function updateContractStatus(studioId: string, contractId: string, status: string, actorId: string) {
  const data: Record<string, unknown> = { status };
  if (status === "signed") data.signedAt = new Date();
  await prisma.clientContract.updateMany({ where: { id: contractId, studioId }, data });
  await recordActivity({ studioId, actorId, action: "contract.status_changed", resourceType: "ClientContract", resourceId: contractId, metadata: { status } });
  return prisma.clientContract.findUnique({ where: { id: contractId } });
}

// ── Feedback ─────────────────────────────────────────────────────────

export async function listFeedback(studioId: string, clientId: string) {
  return prisma.clientFeedback.findMany({ where: { studioId, clientId }, orderBy: { createdAt: "desc" } });
}

export async function addFeedback(studioId: string, clientId: string, input: { eventId?: string; rating: number; comment?: string }, actorId: string) {
  const feedback = await prisma.clientFeedback.create({ data: { studioId, clientId, eventId: input.eventId, rating: input.rating, comment: input.comment } });
  await recordActivity({ studioId, actorId, action: "feedback.recorded", resourceType: "Client", resourceId: clientId, metadata: { rating: input.rating } });
  return feedback;
}
