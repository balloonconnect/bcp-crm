"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MinusCircle, Circle, Sparkles } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, cn } from "@bcp/ui";
import { useOnboarding } from "../../../lib/onboarding-context";

export function FinalReviewStep() {
  const { checklist, progress, complete, seedSampleData } = useOnboarding();
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [finishing, setFinishing] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);
  const [seeded, setSeeded] = React.useState(false);

  async function handleSeedSampleData() {
    setSeeding(true);
    try {
      await seedSampleData();
      setSeeded(true);
    } finally {
      setSeeding(false);
    }
  }

  async function handleFinish() {
    setError(null);
    setFinishing(true);
    try {
      await complete();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Finish the required steps first");
    } finally {
      setFinishing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Final review</CardTitle>
        <p className="text-sm text-muted-foreground">Here&apos;s everything you&apos;ve set up. You can always change any of this later from Settings.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {checklist
            .filter((item) => item.key !== "final_review")
            .map((item) => (
              <li key={item.key} className="flex items-center gap-3 px-4 py-3 text-sm">
                {item.status === "done" && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />}
                {item.status === "skipped" && <MinusCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                {item.status === "pending" && <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden="true" />}
                <span className={cn("flex-1", item.status === "pending" && item.required && "font-medium text-destructive")}>{item.title}</span>
                <span className="text-xs uppercase text-muted-foreground">
                  {item.status === "done" ? "Done" : item.status === "skipped" ? "Skipped" : item.required ? "Required" : "Not set up"}
                </span>
              </li>
            ))}
        </ul>

        {progress && progress.outstandingRequiredSteps.length > 0 && (
          <p role="alert" className="text-sm font-medium text-destructive">
            Finish these required steps first: {progress.outstandingRequiredSteps.filter((s) => s !== "final_review").join(", ")}
          </p>
        )}

        <div className="rounded-md border border-dashed border-border p-4">
          <p className="text-sm font-medium">Want to explore before adding real data?</p>
          <p className="mt-1 text-sm text-muted-foreground">We can add a few sample services, packages, and customers so you can see how everything works.</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={handleSeedSampleData} disabled={seeding || seeded}>
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            {seeded ? "Sample data added" : seeding ? "Adding…" : "Add sample data"}
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button type="button" onClick={handleFinish} disabled={finishing} className="w-full sm:w-auto">
          {finishing ? "Finishing…" : "Finish setup"}
        </Button>
      </CardContent>
    </Card>
  );
}
