"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { apiPost } from "../../lib/api-client";

interface DuplicateMatch {
  lead: { id: string; name: string };
  matchedOn: string[];
  confidence: "high" | "medium";
}

/** Debounced check against `POST /leads/check-duplicates` as contact fields change — surfaces possible matches inline in the create form rather than blocking submission, since a genuine duplicate contact (e.g. a couple's parent calling on their behalf) is a legitimate reason to proceed anyway. */
export function DuplicateWarning({ fields }: { fields: Record<string, string> }) {
  const [matches, setMatches] = React.useState<DuplicateMatch[]>([]);

  React.useEffect(() => {
    const hasContactInfo = fields.phone || fields.alternateMobile || fields.email || fields.instagramProfile1 || fields.instagramProfile2;
    if (!hasContactInfo) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(() => {
      void apiPost<DuplicateMatch[]>("/leads/check-duplicates", {
        phone: fields.phone || undefined,
        alternateMobile: fields.alternateMobile || undefined,
        email: fields.email || undefined,
        instagramProfile1: fields.instagramProfile1 || undefined,
        instagramProfile2: fields.instagramProfile2 || undefined,
      }).then((res) => {
        if (res.ok && res.data) setMatches(res.data);
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.phone, fields.alternateMobile, fields.email, fields.instagramProfile1, fields.instagramProfile2]);

  if (matches.length === 0) return null;

  return (
    <div role="alert" className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
      <div className="flex items-center gap-2 font-medium text-warning">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        Possible duplicate{matches.length > 1 ? "s" : ""} found
      </div>
      <ul className="flex flex-col gap-1 text-muted-foreground">
        {matches.map((match) => (
          <li key={match.lead.id}>
            {match.lead.name} — matched on {match.matchedOn.join(", ")} ({match.confidence} confidence)
          </li>
        ))}
      </ul>
    </div>
  );
}
