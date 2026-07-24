import type { BrandTheme } from "../theme-schema";

/**
 * Public lead-capture forms (embedded on a studio's marketing site, or
 * BCP Studio OS-hosted) only need the identity + color tokens — never
 * internal-only fields like invoiceDesign. This trims the theme to what a
 * public, unauthenticated surface should ever receive.
 */
export interface PublicFormTheme {
  displayName?: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamilyBody?: string;
  borderRadius: number;
  buttonStyle: BrandTheme["buttonStyle"];
  poweredByVisible: boolean;
}

export function resolvePublicFormTheme(theme: BrandTheme): PublicFormTheme {
  return {
    displayName: theme.displayName,
    logoUrl: theme.logoUrl,
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    backgroundColor: theme.backgroundColor,
    textColor: theme.textColor,
    fontFamilyBody: theme.fontFamilyBody,
    borderRadius: theme.borderRadius,
    buttonStyle: theme.buttonStyle,
    poweredByVisible: theme.poweredByVisible,
  };
}
