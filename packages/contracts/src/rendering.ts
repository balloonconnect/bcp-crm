import type { ContractSection } from "./clauses";

/** Named `{{variableName}}` placeholders — the same convention `@bcp/email`'s templates already use (matching ordinary HTML-templating norms), not WhatsApp's numbered `{{1}}` syntax, since a contract is composed and read the same way an email template is. An unmatched variable is left as literal `{{name}}` text rather than going blank, so a studio proofreading a generated contract can immediately spot a variable it forgot to supply. */
export function renderContractVariables(bodyHtml: string, variables: Record<string, string>): string {
  return bodyHtml.replace(/\{\{(\w+)\}\}/g, (match, name: string) => variables[name] ?? match);
}

export function extractContractVariables(bodyHtml: string): string[] {
  const matches = bodyHtml.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

/** Joins a template's ordered sections into one rendered document — each section's own heading plus its (variable-substituted) content, in the order the studio arranged them. */
export function renderContractSections(sections: ContractSection[], variables: Record<string, string>): string {
  return sections.map((section) => `<h3>${section.title}</h3>\n${renderContractVariables(section.content, variables)}`).join("\n\n");
}

export function extractAllSectionVariables(sections: ContractSection[]): string[] {
  const all = sections.flatMap((s) => extractContractVariables(s.content));
  return [...new Set(all)];
}
