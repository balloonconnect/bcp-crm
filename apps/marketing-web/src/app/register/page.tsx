import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@bcp/ui";
import { Hero } from "../../components/marketing/hero";
import { Section, Eyebrow } from "../../components/marketing/section";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Start Your Free Trial",
  description: "Set up your studio in about five minutes — no credit card required for your 14-day trial.",
  path: "/register",
});

const STEPS = ["Create your owner account", "Name your studio", "Add your first branch", "You're on a 14-day trial — everything else can wait"];

export default function RegisterPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Register", path: "/register" }])} />

      <Hero
        eyebrow="Frame 015 · Register"
        title="Set up your studio in about five minutes."
        subtitle="A guided setup gets your studio's owner account, name, and first branch running immediately — everything else (branding, GST, WhatsApp, your team) can be finished any time after."
        primaryCta={{ label: "Start free trial", href: `${appUrl}/onboarding` }}
      />

      <Section tone="paper">
        <div className="mx-auto max-w-xl">
          <Eyebrow>What the guided setup covers</Eyebrow>
          <ul className="mt-4 flex flex-col gap-3">
            {STEPS.map((step) => (
              <li key={step} className="flex items-start gap-3 text-sm text-ink-soft">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-safelight-dim" aria-hidden="true" />
                {step}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-8 w-full bg-safelight text-ink hover:bg-safelight/90 sm:w-auto">
            <a href={`${appUrl}/onboarding`}>Start free trial</a>
          </Button>
          <p className="mt-4 text-sm text-ink-soft">
            Already have a studio?{" "}
            <Link href="/login" className="font-medium text-safelight-dim underline">
              Log in
            </Link>
          </p>
        </div>
      </Section>
    </>
  );
}
