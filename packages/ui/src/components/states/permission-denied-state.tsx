import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { cn } from "../../lib/cn";

export interface PermissionDeniedStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Shown in place of a page/section when the signed-in role lacks a permission (see @bcp/permissions). */
export function PermissionDeniedState({
  title = "You do not have access to this",
  description = "Ask a studio admin to grant you access, or switch to an account with permission.",
  action,
  className,
}: PermissionDeniedStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ShieldAlert className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="max-w-sm">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
