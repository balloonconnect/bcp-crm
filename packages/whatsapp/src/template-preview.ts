/**
 * Substitutes `{{1}}`, `{{2}}`, ... placeholders in a template body with
 * real values — the exact same positional convention Meta's own
 * template syntax uses, so there's no translation layer between what
 * this renders and what Meta actually sends. Used for both the in-app
 * "template variable preview" feature and to build the `variables`
 * array `WhatsAppClient.sendTemplate()` needs.
 */
export function previewTemplate(bodyText: string, variables: string[]): string {
  return bodyText.replace(/\{\{(\d+)\}\}/g, (match, indexStr: string) => {
    const index = Number(indexStr) - 1;
    return variables[index] ?? match;
  });
}

/** Counts the distinct `{{n}}` placeholders in a template body — used to validate that a caller supplied the right number of variables before sending. */
export function countTemplateVariables(bodyText: string): number {
  const matches = bodyText.match(/\{\{\d+\}\}/g);
  if (!matches) return 0;
  return new Set(matches).size;
}
