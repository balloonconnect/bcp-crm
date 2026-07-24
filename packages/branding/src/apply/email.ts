import { cssVariablesToInlineStyle, themeToCssVariables } from "../css-variables";
import type { BrandTheme } from "../theme-schema";

/**
 * Wraps an email body in a branded header/footer. Email clients don't
 * reliably support external stylesheets or CSS custom properties, so this
 * inlines every color as a literal hex value rather than using the
 * `var(--x)` pattern the rest of the product uses — see
 * docs/branding.md § "Why email doesn't use CSS variables".
 */
export function wrapEmailWithBrand(theme: BrandTheme, bodyHtml: string): string {
  const headerImage = theme.emailHeaderImageUrl
    ? `<img src="${theme.emailHeaderImageUrl}" alt="${theme.displayName ?? ""}" style="max-height:48px;" />`
    : `<span style="font-size:20px;font-weight:600;color:${theme.primaryColor};">${theme.displayName ?? ""}</span>`;

  const header = theme.emailHeaderHtml ?? `<div style="padding:24px;text-align:center;">${headerImage}</div>`;

  const footerLinks = (theme.socialLinks ?? [])
    .map((link) => `<a href="${link.url}" style="color:${theme.accentColor};text-decoration:none;margin:0 6px;">${link.platform}</a>`)
    .join("");

  const footer =
    theme.emailFooterHtml ??
    `<div style="padding:24px;text-align:center;font-size:12px;color:${theme.secondaryColor ?? "#71717A"};">
      ${theme.copyrightText ? `<p>${theme.copyrightText}</p>` : ""}
      ${theme.supportEmail ? `<p>Questions? <a href="mailto:${theme.supportEmail}" style="color:${theme.accentColor};">${theme.supportEmail}</a></p>` : ""}
      ${footerLinks ? `<p>${footerLinks}</p>` : ""}
      ${theme.poweredByVisible ? `<p style="opacity:0.6;">Powered by BCP Studio OS</p>` : ""}
    </div>`;

  return `<!doctype html>
<html>
  <body style="margin:0;background:${theme.backgroundColor ?? "#F7F7F8"};font-family:${theme.fontFamilyBody ?? "Inter"},sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#FFFFFF;">
      ${header}
      <div style="padding:24px;color:${theme.textColor ?? "#14161A"};">${bodyHtml}</div>
      ${footer}
    </div>
  </body>
</html>`;
}

/** For the rare email client/preview surface that does support CSS variables (e.g. an in-app email preview pane). */
export function emailInlineThemeStyle(theme: BrandTheme): string {
  return cssVariablesToInlineStyle(themeToCssVariables(theme));
}
