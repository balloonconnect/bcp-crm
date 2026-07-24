"use client";

import * as React from "react";
import { themeToCssVariables, cssVariablesToRootBlock } from "../css-variables";
import type { BrandTheme } from "../theme-schema";

const BrandThemeContext = React.createContext<BrandTheme | null>(null);

export interface BrandThemeProviderProps {
  theme: BrandTheme;
  children: React.ReactNode;
  /** Scope the generated CSS variables to this element instead of `:root` — used by ThemePreview to show several themes on one page at once. */
  scopeSelector?: string;
}

/**
 * Injects the resolved theme as CSS custom properties via a `<style>` tag
 * (server-render-safe — no `useEffect`/DOM mutation required, so this
 * works the same in a Next.js server component tree and in the browser).
 * Because @bcp/ui's whole design system reads these same variable names
 * (`--primary`, `--accent`, `--radius`, …), every component in that
 * package is automatically re-themed — no per-component branding code
 * needed anywhere else in the product.
 */
export function BrandThemeProvider({ theme, children, scopeSelector }: BrandThemeProviderProps) {
  const vars = React.useMemo(() => themeToCssVariables(theme), [theme]);
  const css = React.useMemo(
    () => (scopeSelector ? cssVariablesToRootBlock(vars).replace(":root", scopeSelector) : cssVariablesToRootBlock(vars)),
    [vars, scopeSelector],
  );

  return (
    <BrandThemeContext.Provider value={theme}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {children}
    </BrandThemeContext.Provider>
  );
}

export function useBrandTheme(): BrandTheme {
  const theme = React.useContext(BrandThemeContext);
  if (!theme) {
    throw new Error("useBrandTheme must be used within a <BrandThemeProvider>");
  }
  return theme;
}
