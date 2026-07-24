"use client";

import * as React from "react";
import { CheckCircle2, Circle, MinusCircle, Menu } from "lucide-react";
import { Button, ResponsiveDrawer, cn } from "@bcp/ui";
import { ONBOARDING_STEPS } from "@bcp/onboarding";
import { useOnboarding } from "../../lib/onboarding-context";

function StepStatusIcon({ status }: { status: "done" | "skipped" | "pending" | "active" }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />;
  if (status === "skipped") return <MinusCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
  return <Circle className={cn("h-4 w-4", status === "active" ? "text-brand" : "text-muted-foreground/40")} aria-hidden="true" />;
}

function StepList({ onNavigate }: { onNavigate?: () => void }) {
  const { session, activeStepKey, setActiveStepKey } = useOnboarding();

  return (
    <nav aria-label="Onboarding steps" className="flex flex-col gap-1">
      {ONBOARDING_STEPS.map((step) => {
        const isDone = session?.completedSteps.includes(step.key);
        const isSkipped = session?.skippedSteps.includes(step.key);
        const isActive = step.key === activeStepKey;
        const status = isActive ? "active" : isDone ? "done" : isSkipped ? "skipped" : "pending";

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => {
              setActiveStepKey(step.key);
              onNavigate?.();
            }}
            aria-current={isActive ? "step" : undefined}
            className={cn(
              "flex min-h-touch-target items-center gap-3 rounded-md px-3 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              isActive && "bg-accent font-medium text-brand",
            )}
          >
            <StepStatusIcon status={status} />
            <span className="flex-1 truncate">
              {step.order}. {step.title}
            </span>
            {!step.required && <span className="text-[10px] uppercase text-muted-foreground">optional</span>}
          </button>
        );
      })}
    </nav>
  );
}

export function WizardProgressBar() {
  const { progress } = useOnboarding();
  if (!progress) return null;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Step {progress.completedCount + progress.skippedCount} of {progress.totalSteps}
        </span>
        <span>{progress.percentComplete}% complete</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress.percentComplete}%` }}
          role="progressbar"
          aria-valuenow={progress.percentComplete}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

export interface WizardShellProps {
  children: React.ReactNode;
}

/**
 * Mobile-friendly by construction, not as an afterthought: the full step
 * list only renders as a permanent sidebar at `lg`+ (desktop); below
 * that it collapses into a `ResponsiveDrawer` triggered by a compact
 * "Steps" button, following the same responsive-navigation pattern the
 * rest of the product uses (see docs/navigation.md from the design-system
 * phase) rather than a bespoke mobile treatment just for onboarding.
 */
export function WizardShell({ children }: WizardShellProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:gap-8 lg:p-8">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-8">
          <h2 className="mb-4 text-sm font-semibold">Setting up your studio</h2>
          <StepList />
        </div>
      </aside>

      <div className="flex-1">
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <ResponsiveDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            title="Onboarding steps"
            side="left"
            trigger={
              <Button variant="outline" size="sm">
                <Menu className="mr-2 h-4 w-4" aria-hidden="true" />
                Steps
              </Button>
            }
          >
            <StepList onNavigate={() => setDrawerOpen(false)} />
          </ResponsiveDrawer>
        </div>

        <div className="mb-6">
          <WizardProgressBar />
        </div>

        {children}
      </div>
    </div>
  );
}
