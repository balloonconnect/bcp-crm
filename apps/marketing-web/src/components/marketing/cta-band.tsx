import Link from "next/link";
import { Button } from "@bcp/ui";

export function CtaBand({
  title = "Ready to run your studio from one platform?",
  subtitle = "Start your 14-day trial — no credit card required — or book a walkthrough with our team.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-safelight px-4 py-16 text-ink sm:px-6 sm:py-20">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-6 sm:items-center sm:text-center">
        <h2 className="font-display text-3xl leading-tight sm:text-4xl">{title}</h2>
        <p className="max-w-xl text-base text-ink/80">{subtitle}</p>
        <div className="flex flex-col gap-3 xs:flex-row">
          <Button asChild size="lg" className="bg-ink text-paper hover:bg-ink/90">
            <Link href="/register">Start free trial</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-ink/30 text-ink hover:bg-ink/10">
            <Link href="/book-demo">Book a demo</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
