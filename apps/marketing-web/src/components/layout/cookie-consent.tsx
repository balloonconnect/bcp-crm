"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@bcp/ui";

const CONSENT_KEY = "bcp_analytics_consent"; // "granted" | "denied"

export function getAnalyticsConsent(): "granted" | "denied" | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(CONSENT_KEY);
  return value === "granted" || value === "denied" ? value : null;
}

/**
 * A consent banner gating analytics, not just disclosing it — nothing in
 * `components/layout/analytics.tsx` loads until this is explicitly
 * "granted" (see that file). Choice persists in `localStorage`; visiting
 * again after choosing doesn't re-prompt.
 */
export function CookieConsent() {
  const [choice, setChoice] = React.useState<"granted" | "denied" | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setChoice(getAnalyticsConsent());
    setReady(true);
  }, []);

  function choose(value: "granted" | "denied") {
    localStorage.setItem(CONSENT_KEY, value);
    setChoice(value);
    window.dispatchEvent(new Event("bcp-analytics-consent-changed"));
  }

  if (!ready || choice !== null) return null;

  return (
    <div role="dialog" aria-label="Cookie preferences" className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-soft/30 bg-ink/98 px-4 py-5 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-faint">
          We use cookies for basic analytics to understand how this site is used. No analytics run until you allow them.{" "}
          <Link href="/privacy" className="underline hover:text-paper">
            Read our privacy policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" className="border-ink-soft/40 text-paper hover:bg-charcoal" onClick={() => choose("denied")}>
            Decline
          </Button>
          <Button size="sm" className="bg-safelight text-ink hover:bg-safelight/90" onClick={() => choose("granted")}>
            Allow analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
