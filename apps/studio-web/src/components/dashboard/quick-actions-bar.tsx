"use client";

import * as React from "react";
import { UserPlus, Users, FileText, Wallet, CalendarPlus, Images, BellRing, Receipt } from "lucide-react";
import { Button } from "@bcp/ui";
import { QUICK_ACTIONS, type QuickActionKey } from "@bcp/dashboard";
import { QuickActionDialog } from "./quick-action-dialog";

const ICONS: Record<QuickActionKey, React.ComponentType<{ className?: string }>> = {
  add_lead: UserPlus,
  add_client: Users,
  create_quotation: FileText,
  record_payment: Wallet,
  create_event: CalendarPlus,
  upload_gallery: Images,
  send_reminder: BellRing,
  create_invoice: Receipt,
};

export function QuickActionsBar() {
  const [activeAction, setActiveAction] = React.useState<QuickActionKey | null>(null);

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {QUICK_ACTIONS.map((action) => {
          const Icon = ICONS[action.key];
          return (
            <Button key={action.key} type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setActiveAction(action.key)}>
              <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
              {action.label}
            </Button>
          );
        })}
      </div>

      <QuickActionDialog actionKey={activeAction} onClose={() => setActiveAction(null)} />
    </>
  );
}
