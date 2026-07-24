"use client";

import * as React from "react";
import { getStudioThemeStyle } from "../../lib/theme";
import { getPortalSessionToken } from "../../lib/portal-session";
import { PortalLogin } from "./portal-login";
import { PortalDashboard } from "./portal-dashboard";

/** Studio branding and custom-domain resolution both flow from the same `/public/branding` lookup by studio slug every other public surface in this codebase already uses — the client portal doesn't need its own separate branding mechanism. */
export function PortalApp({ studioSlug }: { studioSlug: string }) {
  const [themeStyle, setThemeStyle] = React.useState<React.CSSProperties>({});
  const [studioName, setStudioName] = React.useState(studioSlug);
  const [sessionToken, setSessionToken] = React.useState<string | null>(null);
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    void getStudioThemeStyle(studioSlug).then(({ style, theme }) => {
      setThemeStyle(style);
      if (theme?.displayName) setStudioName(theme.displayName);
    });
    setSessionToken(getPortalSessionToken(studioSlug));
    setChecked(true);
  }, [studioSlug]);

  if (!checked) return null;

  return (
    <div style={themeStyle}>
      {sessionToken ? (
        <PortalDashboard studioSlug={studioSlug} studioName={studioName} sessionToken={sessionToken} onLogout={() => setSessionToken(null)} />
      ) : (
        <PortalLogin studioSlug={studioSlug} studioName={studioName} onLoggedIn={() => setSessionToken(getPortalSessionToken(studioSlug))} />
      )}
    </div>
  );
}
