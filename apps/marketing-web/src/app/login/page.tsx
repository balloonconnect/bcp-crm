import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "../../components/marketing/hero";
import { Section } from "../../components/marketing/section";
import { FindStudioForm } from "../../components/marketing/find-studio-form";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Log In",
  description: "Sign in to your studio's BCP Studio OS account.",
  path: "/login",
  index: false,
});

export default function LoginPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Log in", path: "/login" }])} />

      <Hero eyebrow="Frame 014 · Log in" title="Sign in to your studio." subtitle="Every studio has its own address — enter yours and we'll take you to sign in." />

      <Section tone="paper">
        <div className="mx-auto max-w-md">
          <FindStudioForm />
          <p className="mt-6 text-center text-sm text-ink-soft">
            Don&apos;t have a studio yet?{" "}
            <Link href="/register" className="font-medium text-safelight-dim underline">
              Start a free trial
            </Link>
          </p>
        </div>
      </Section>
    </>
  );
}
