import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import type { Breadcrumb } from "./nav-types";

export interface ResponsivePageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  /** Primary actions — on mobile these wrap to a new row rather than scroll or clip. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Page-level header used inside ResponsiveContentContainer. Distinct from
 * the shell's top bar (global search/notifications/quick-create), which
 * stays fixed across every page — this one is per-page content.
 */
export function ResponsivePageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: ResponsivePageHeaderProps) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                  {crumb.href && !isLast ? (
                    <a
                      href={crumb.href}
                      className="min-h-touch-target rounded px-1 py-1 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className={cn("px-1 py-1", isLast && "font-medium text-foreground")} aria-current={isLast ? "page" : undefined}>
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-4 xs:flex-row xs:items-start xs:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
