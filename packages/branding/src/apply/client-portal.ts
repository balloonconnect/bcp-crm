import type { BrandTheme } from "../theme-schema";

export function resolveClientPortalTheme(theme: BrandTheme): BrandTheme {
  const overrides = theme.clientPortalTheme ?? {};
  return { ...theme, ...overrides };
}
