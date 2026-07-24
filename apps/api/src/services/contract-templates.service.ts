import { prisma } from "@bcp/database";
import { extractAllSectionVariables, type ContractSection } from "@bcp/contracts";
import { recordActivity } from "./activity-log.service";

export class ContractTemplateNotFoundError extends Error {
  readonly code = "CONTRACT_TEMPLATE_NOT_FOUND";
  constructor() {
    super("Contract template not found");
    this.name = "ContractTemplateNotFoundError";
  }
}

export async function listTemplates(studioId: string) {
  return prisma.contractTemplate.findMany({ where: { studioId }, orderBy: { name: "asc" } });
}

export async function getTemplate(studioId: string, templateId: string) {
  const template = await prisma.contractTemplate.findFirst({ where: { id: templateId, studioId } });
  if (!template) throw new ContractTemplateNotFoundError();
  return template;
}

/** "Allow each studio to manage its own templates" — every studio's templates are entirely its own; nothing here is shared or platform-provided beyond the suggested clause-type registry (`@bcp/contracts`' `CONTRACT_CLAUSE_TYPES`), which is just labels for a template-builder UI, not content. */
export async function createTemplate(studioId: string, input: { name: string; category?: string; sections: ContractSection[] }, actorId: string) {
  const template = await prisma.contractTemplate.create({
    data: { studioId, name: input.name, category: input.category, sections: input.sections, variables: extractAllSectionVariables(input.sections) },
  });
  await recordActivity({ studioId, actorId, action: "contract_template.created", resourceType: "ContractTemplate", resourceId: template.id, metadata: { name: template.name } });
  return template;
}

export async function updateTemplate(studioId: string, templateId: string, input: { name?: string; category?: string; sections?: ContractSection[]; isActive?: boolean }, actorId: string) {
  const existing = await getTemplate(studioId, templateId);
  const sections = input.sections ?? (existing.sections as unknown as ContractSection[]);

  const template = await prisma.contractTemplate.update({
    where: { id: templateId },
    data: { name: input.name, category: input.category, sections: input.sections, variables: input.sections ? extractAllSectionVariables(sections) : undefined, isActive: input.isActive },
  });
  await recordActivity({ studioId, actorId, action: "contract_template.updated", resourceType: "ContractTemplate", resourceId: templateId });
  return template;
}

export async function deleteTemplate(studioId: string, templateId: string, actorId: string) {
  await getTemplate(studioId, templateId);
  await prisma.contractTemplate.delete({ where: { id: templateId } });
  await recordActivity({ studioId, actorId, action: "contract_template.deleted", resourceType: "ContractTemplate", resourceId: templateId });
}
