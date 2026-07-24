import type { BrandTheme, InvoiceDesign } from "../theme-schema";

export interface ResolvedInvoiceDesign extends InvoiceDesign {
  accentColor: string;
  logoUrl?: string;
  watermarkUrl?: string;
}

/**
 * Merges the studio-wide theme with the invoice-specific overrides (a
 * studio might want a muted, print-friendly accent on invoices even if
 * their in-app accent is bold) into the token set the invoice/receipt
 * renderer (apps/api's PDF generation, added in a later phase) consumes.
 */
export function resolveInvoiceDesign(theme: BrandTheme): ResolvedInvoiceDesign {
  const overrides = theme.invoiceDesign ?? {};
  return {
    accentColor: overrides.accentColorOverride ?? theme.accentColor,
    showLogo: overrides.showLogo ?? true,
    showWatermark: overrides.showWatermark ?? false,
    footerNote: overrides.footerNote ?? theme.copyrightText,
    numberFormat: overrides.numberFormat ?? "INV-{YYYY}-{seq}",
    logoUrl: theme.logoUrl,
    watermarkUrl: overrides.showWatermark ? theme.watermarkUrl : undefined,
  };
}

/** Receipts reuse the invoice design as-is — same brand surface, simpler document. */
export const resolveReceiptDesign = resolveInvoiceDesign;
