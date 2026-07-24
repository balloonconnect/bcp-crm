"use client";

import * as React from "react";
import Script from "next/script";
import { getAnalyticsConsent } from "./cookie-consent";

/**
 * Loads an analytics script only once consent is "granted", and only if
 * `NEXT_PUBLIC_ANALYTICS_ID` is configured — no provider is wired by
 * default. Listens for the consent-changed event `CookieConsent` fires
 * so choosing "Allow" loads it immediately without a page refresh, and
 * re-checks on mount so a returning visitor who already granted consent
 * gets analytics without seeing the banner again.
 */
export function Analytics() {
  const [enabled, setEnabled] = React.useState(false);
  const analyticsId = process.env.NEXT_PUBLIC_ANALYTICS_ID;

  React.useEffect(() => {
    function sync() {
      setEnabled(getAnalyticsConsent() === "granted");
    }
    sync();
    window.addEventListener("bcp-analytics-consent-changed", sync);
    return () => window.removeEventListener("bcp-analytics-consent-changed", sync);
  }, []);

  if (!enabled || !analyticsId) return null;

  // Placeholder loader — swap the `src` for a real provider (Plausible,
  // GA4, PostHog, etc.) once one is chosen; the consent gating above
  // already does the hard part.
  return <Script id="bcp-analytics" strategy="afterInteractive" src={`https://analytics.example.com/script.js?id=${analyticsId}`} />;
}
