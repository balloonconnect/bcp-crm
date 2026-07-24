import { z } from "zod";

/**
 * The complete set of white-label branding fields. Mirrors
 * @bcp/database's StudioBrand columns field-for-field (plus the JSON
 * sub-shapes below) — this is the shape platform defaults, studio
 * overrides, and branch overrides all resolve into. See
 * packages/branding/docs/branding.md for the resolution model.
 */

export const socialLinkSchema = z.object({
  platform: z.enum(["instagram", "facebook", "youtube", "pinterest", "x", "linkedin", "website"]),
  url: z.string().url(),
});
export type SocialLink = z.infer<typeof socialLinkSchema>;

export const buttonStyleSchema = z.enum(["solid", "outline", "ghost", "pill"]);
export type ButtonStyle = z.infer<typeof buttonStyleSchema>;

export const cardStyleSchema = z.enum(["flat", "elevated", "bordered"]);
export type CardStyle = z.infer<typeof cardStyleSchema>;

export const watermarkPositionSchema = z.enum([
  "top_left",
  "top_right",
  "bottom_left",
  "bottom_right",
  "center",
  "tiled",
]);
export type WatermarkPosition = z.infer<typeof watermarkPositionSchema>;

export const invoiceDesignSchema = z.object({
  accentColorOverride: z.string().optional(),
  showLogo: z.boolean().default(true),
  showWatermark: z.boolean().default(false),
  footerNote: z.string().optional(),
  numberFormat: z.string().default("INV-{YYYY}-{seq}"),
});
export type InvoiceDesign = z.infer<typeof invoiceDesignSchema>;

/** Per-surface partial override — any color/typography token from BrandTheme, all optional. */
export const surfaceThemeOverrideSchema = z
  .object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    fontFamilyBody: z.string().optional(),
    fontFamilyHeading: z.string().optional(),
    borderRadius: z.number().int().min(0).max(32).optional(),
  })
  .partial();
export type SurfaceThemeOverride = z.infer<typeof surfaceThemeOverrideSchema>;

export const brandThemeSchema = z.object({
  // Identity
  displayName: z.string().min(1).max(120).optional(),
  legalBusinessName: z.string().min(1).max(160).optional(),

  // Logos & favicon
  logoUrl: z.string().url().optional(),
  logoLightUrl: z.string().url().optional(),
  logoDarkUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),

  // Color tokens (hex strings; validated for parseability in contrast.ts)
  primaryColor: z.string().min(4).max(9),
  secondaryColor: z.string().min(4).max(9).optional(),
  accentColor: z.string().min(4).max(9),
  backgroundColor: z.string().min(4).max(9).optional(),
  textColor: z.string().min(4).max(9).optional(),

  // Typography & shape
  fontFamilyBody: z.string().min(1).max(80).optional(),
  fontFamilyHeading: z.string().min(1).max(80).optional(),
  borderRadius: z.number().int().min(0).max(32).default(8),
  buttonStyle: buttonStyleSchema.default("solid"),
  cardStyle: cardStyleSchema.default("elevated"),

  // Surfaces
  loginBackgroundUrl: z.string().url().optional(),
  emailHeaderImageUrl: z.string().url().optional(),
  emailHeaderHtml: z.string().max(5000).optional(),
  emailFooterHtml: z.string().max(5000).optional(),
  emailFromName: z.string().max(120).optional(),
  emailFromAddress: z.string().email().optional(),

  // Watermark
  watermarkUrl: z.string().url().optional(),
  watermarkOpacity: z.number().min(0).max(1).default(0.5),
  watermarkPosition: watermarkPositionSchema.default("bottom_right"),

  // Per-surface overrides
  invoiceDesign: invoiceDesignSchema.partial().optional(),
  galleryTheme: surfaceThemeOverrideSchema.optional(),
  clientPortalTheme: surfaceThemeOverrideSchema.optional(),

  // Contact & legal footer
  copyrightText: z.string().max(200).optional(),
  supportEmail: z.string().email().optional(),
  whatsappNumber: z.string().max(20).optional(),
  whatsappDisplayName: z.string().max(80).optional(),
  socialLinks: z.array(socialLinkSchema).max(10).default([]),

  poweredByVisible: z.boolean().default(true),
});

export type BrandTheme = z.infer<typeof brandThemeSchema>;

/** Every field is optional — a partial theme is what a studio/branch override row represents. */
export const partialBrandThemeSchema = brandThemeSchema.partial();
export type PartialBrandTheme = z.infer<typeof partialBrandThemeSchema>;
