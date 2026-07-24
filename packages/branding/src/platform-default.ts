import type { BrandTheme } from "./theme-schema";

/**
 * The platform default theme — matches @bcp/ui's design system tokens
 * exactly (see packages/ui/src/styles/globals.css), so a studio that
 * hasn't customized anything yet looks identical to the base BCP Studio OS
 * look, not an unstyled fallback.
 */
export const PLATFORM_DEFAULT_THEME: BrandTheme = {
  primaryColor: "#14161A",
  secondaryColor: "#71717A",
  accentColor: "#E8A33D",
  backgroundColor: "#F7F7F8",
  textColor: "#14161A",

  fontFamilyBody: "Inter",
  fontFamilyHeading: "Inter",
  borderRadius: 8,
  buttonStyle: "solid",
  cardStyle: "elevated",

  watermarkOpacity: 0.5,
  watermarkPosition: "bottom_right",

  socialLinks: [],
  poweredByVisible: true,
};
