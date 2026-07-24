import { WifiOff } from "lucide-react";
import { cn } from "../../lib/cn";

export interface OfflineStateProps {
  title?: string;
  description?: string;
  className?: string;
  variant?: "full" | "banner";
}

export function OfflineState({
  title = "You are offline",
  description = "Changes will sync once your connection is back.",
  className,
  variant = "full",
}: OfflineStateProps) {
  if (variant === "banner") {
    return (
      <div
        role="status"
        className={cn(
          "flex min-h-touch-target items-center justify-center gap-2 bg-warning px-4 text-center text-sm font-medium text-warning-foreground",
          className,
        )}
      >
        <WifiOff className="h-4 w-4" aria-hidden="true" />
        {title} — {description}
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="max-w-sm">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
