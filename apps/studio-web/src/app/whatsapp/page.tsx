"use client";

import * as React from "react";
import { cn } from "@bcp/ui";
import { ConfigTab } from "../../components/whatsapp/config-tab";
import { TemplatesTab } from "../../components/whatsapp/templates-tab";
import { MessagesTab } from "../../components/whatsapp/messages-tab";
import { ConsentTab } from "../../components/whatsapp/consent-tab";

const TABS = [
  { key: "messages", label: "Messages" },
  { key: "templates", label: "Templates" },
  { key: "consent", label: "Opt-in / opt-out" },
  { key: "config", label: "Configuration" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function WhatsAppPage() {
  const [tab, setTab] = React.useState<TabKey>("messages");

  return (
    <main className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 font-display text-2xl">WhatsApp</h1>

      <div role="tablist" aria-label="WhatsApp sections" className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn("border-b-2 px-3 py-2 text-sm font-medium", tab === t.key ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "messages" && <MessagesTab />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "consent" && <ConsentTab />}
      {tab === "config" && <ConfigTab />}
    </main>
  );
}
