/**
 * Substitutes `{{variableName}}` placeholders — named, not positional,
 * deliberately different from `@bcp/whatsapp`'s `{{1}}` convention
 * because it's matching a different external norm: nearly every HTML
 * email templating tool uses named variables, where Meta's WhatsApp
 * templates specifically use numbered parameters. Unmatched variables
 * are left as literal `{{name}}` text in the output rather than
 * silently becoming blank, so a missing variable is visible in a
 * preview rather than looking like intentional empty content.
 */
export function renderEmailTemplate(bodyHtml: string, variables: Record<string, string>): string {
  return bodyHtml.replace(/\{\{(\w+)\}\}/g, (match, name: string) => variables[name] ?? match);
}

export function extractTemplateVariables(bodyHtml: string): string[] {
  const matches = bodyHtml.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

/**
 * Wraps a template's rendered body in the studio's own branding — logo,
 * display name, and brand color — so every email (not just the
 * marketing-facing ones) carries the sending studio's identity rather
 * than looking like a generic platform notification. Mirrors the same
 * branding fields `@bcp/branding` already applies to the client
 * portal and public quotation/gallery pages.
 */
export function applyStudioBranding(bodyHtml: string, branding: { studioName: string; logoUrl?: string; brandColor?: string }): string {
  const color = branding.brandColor ?? "#111111";
  const logo = branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.studioName}" style="max-height:48px;margin-bottom:16px" />` : "";
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">${logo}<div style="border-top:3px solid ${color};padding-top:16px">${bodyHtml}</div><p style="color:#888;font-size:12px;margin-top:24px">${branding.studioName}</p></div>`;
}
