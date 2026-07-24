/** Builds the public form URL — resolved by `(studioSlug, formSlug)`, the same hostname-independent public-access pattern `/public/branding` uses, so the link works whether or not a studio has a custom domain configured. */
export function buildPublicFormUrl(baseUrl: string, studioSlug: string, formSlug: string): string {
  return `${baseUrl.replace(/\/$/, "")}/enquire/${studioSlug}/${formSlug}`;
}

export function buildEmbedCode(publicUrl: string, options?: { width?: string; height?: string }): string {
  const width = options?.width ?? "100%";
  const height = options?.height ?? "800";
  return `<iframe src="${publicUrl}" title="Enquiry form" width="${width}" height="${height}" style="border:0;max-width:100%;" loading="lazy"></iframe>`;
}
