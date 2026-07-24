import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

export interface LoadingStateProps {
  label?: string;
  className?: string;
  inline?: boolean;
}

/**
 * The spinner is the one place motion is load-bearing (it communicates
 * "in progress"), so instead of removing it under reduced motion we swap
 * to a subtle opacity pulse — still legible as "busy" without a spin.
 */
export function LoadingState({ label = "Loading…", className, inline }: LoadingStateProps) {
  if (inline) {
    return (
      <span className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)} role="status">
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-pulse" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <div
      role="status"
      className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground motion-reduce:animate-pulse" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
