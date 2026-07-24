import type { Metadata } from "next";
import { LegalPage } from "../../components/marketing/legal-page";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";
import { SITE } from "../../lib/content";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How BCP Studio OS collects, uses, and protects data for studios and their clients.",
  path: "/privacy",
});

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Privacy Policy", path: "/privacy" }])} />
      <LegalPage
        title="Privacy Policy"
        effectiveDate="July 12, 2026"
        intro="This policy explains what data BCP Studio OS collects from studios and their clients, how it's used, and the choices available to you. It applies to bcpstudio.app, the BCP Studio OS product, and every studio subdomain and custom domain running on the platform."
        sections={[
          {
            heading: "1. Who this applies to",
            body: (
              <>
                <p>
                  &ldquo;Studio&rdquo; means a business using BCP Studio OS to run its photography operations.
                  &ldquo;Studio data&rdquo; means the leads, clients, bookings, galleries, and other business records
                  a studio stores on the platform. &ldquo;You&rdquo; may be a studio owner, a studio&apos;s team
                  member, or a studio&apos;s client
                  interacting with a gallery or client portal.
                </p>
                <p>Each studio is the data controller for its own studio data; BCP Studio OS acts as the data processor.</p>
              </>
            ),
          },
          {
            heading: "2. What we collect",
            body: (
              <ul className="list-disc pl-5">
                <li>Account information: name, email, phone number, and password (stored hashed, never in plain text).</li>
                <li>Studio data entered by studios or their clients: leads, bookings, quotations, invoices, uploaded photos, and gallery selections.</li>
                <li>Usage data: log-in history, device and session information, and API/feature usage needed for security and plan-limit enforcement.</li>
                <li>Payment information for subscription billing, processed by our payment providers — full card details are never stored on our servers.</li>
              </ul>
            ),
          },
          {
            heading: "3. How we use it",
            body: (
              <p>
                Data is used to operate the platform (authentication, storage, gallery delivery, WhatsApp and email
                notifications), to enforce each studio&apos;s subscription plan limits, to provide customer support,
                and to maintain security (audit logs, fraud prevention, abuse detection). We do not sell studio data
                or client data to third parties.
              </p>
            ),
          },
          {
            heading: "4. Data isolation between studios",
            body: (
              <p>
                Every studio&apos;s data is scoped at the database layer so it cannot be accessed by another studio.
                See our <a href="/security" className="underline">Security page</a> for more detail on how this is enforced.
              </p>
            ),
          },
          {
            heading: "5. Third-party services",
            body: (
              <p>
                We use third-party infrastructure providers for hosting, storage, email delivery, WhatsApp Business
                messaging, and payment processing. These providers process data only as needed to deliver the
                service and under their own data protection obligations.
              </p>
            ),
          },
          {
            heading: "6. Your choices",
            body: (
              <ul className="list-disc pl-5">
                <li>Studios can export their client and booking data at any time from Settings.</li>
                <li>Clients can request that a studio delete their personal information by contacting that studio directly.</li>
                <li>Analytics on this marketing site only run after you explicitly allow them via the cookie banner.</li>
              </ul>
            ),
          },
          {
            heading: "7. Data retention",
            body: (
              <p>
                Studio data is retained for as long as a studio&apos;s account is active. If an account is cancelled,
                data remains accessible in a read-only state for 30 days before deletion — see our{" "}
                <a href="/refund-policy" className="underline">Refund Policy</a> for related billing terms.
              </p>
            ),
          },
          {
            heading: "8. Contact us",
            body: <p>Questions about this policy can be sent to {SITE.supportEmail}.</p>,
          },
        ]}
      />
    </>
  );
}
