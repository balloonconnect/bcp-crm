import type { Metadata } from "next";
import { Hero } from "../../components/marketing/hero";
import { Eyebrow, Section } from "../../components/marketing/section";
import { CtaBand } from "../../components/marketing/cta-band";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Security",
  description: "How BCP Studio OS isolates every studio's data, protects accounts, and keeps galleries safe.",
  path: "/security",
});

const PRACTICES = [
  {
    title: "Studio-level data isolation",
    body: "Every studio's data is scoped at the database layer, not just the application layer — a bug in one request can't leak another studio's clients, galleries, or invoices.",
  },
  {
    title: "Hashed passwords, never plain text",
    body: "Passwords are hashed, never stored or logged in plain text. Two-factor authentication with recovery codes is available on every account.",
  },
  {
    title: "Role-based access control",
    body: "Team members only see what their role permits — a freelancer editor and a studio owner have very different views of the same account by design.",
  },
  {
    title: "Session & device visibility",
    body: "See every signed-in device, log out remotely, and get notified of new logins — account takeovers don't go unnoticed.",
  },
  {
    title: "Verified custom domains",
    body: "Custom domains are DNS-verified before they're activated, closing the door on host-header spoofing between studios sharing the platform.",
  },
  {
    title: "Audit logs on sensitive actions",
    body: "Billing changes, permission changes, and domain changes are logged with who did what and when — visible to studio owners and platform admins.",
  },
];

export default function SecurityPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Security", path: "/security" }])} />

      <Hero
        eyebrow="Frame 009 · Security"
        title="Every studio, developed in its own darkroom."
        subtitle="Your client list, your galleries, and your financial data are isolated from every other studio on the platform — by design, not by convention."
      />

      <Section tone="paper">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {PRACTICES.map((practice) => (
            <div key={practice.title}>
              <h3 className="font-display text-xl">{practice.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{practice.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="ink">
        <Eyebrow tone="ink">Have a security question?</Eyebrow>
        <h2 className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
          Reach our team directly for anything not covered here — including data processing or compliance questions.
        </h2>
      </Section>

      <CtaBand title="Talk to us about security" subtitle="Book a walkthrough with our team, or reach out through the contact page for anything specific." />
    </>
  );
}
