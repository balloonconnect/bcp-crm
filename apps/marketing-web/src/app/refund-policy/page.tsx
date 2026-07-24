import type { Metadata } from "next";
import { LegalPage } from "../../components/marketing/legal-page";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";
import { SITE } from "../../lib/content";

export const metadata: Metadata = buildMetadata({
  title: "Refund Policy",
  description: "How refunds, trial cancellations, and billing disputes are handled for BCP Studio OS subscriptions.",
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Refund Policy", path: "/refund-policy" }])} />
      <LegalPage
        title="Refund Policy"
        effectiveDate="July 12, 2026"
        intro="This policy explains how refunds and cancellations work for BCP Studio OS subscriptions."
        sections={[
          {
            heading: "1. Free trial",
            body: <p>Every new studio starts on a 14-day free trial. You won&apos;t be charged during the trial, and there&apos;s nothing to cancel if you decide not to continue — the trial simply ends.</p>,
          },
          {
            heading: "2. Monthly subscriptions",
            body: (
              <p>
                Monthly subscriptions can be cancelled at any time from Settings. Cancelling stops future billing;
                we don&apos;t provide partial refunds for the remainder of an already-billed month, since access
                continues through the end of that billing period.
              </p>
            ),
          },
          {
            heading: "3. Yearly subscriptions",
            body: (
              <p>
                Yearly subscriptions can be cancelled within 14 days of the initial purchase or a renewal for a full
                refund. After that 14-day window, yearly subscriptions are non-refundable for the remainder of the
                term, but you can still cancel to stop future renewals.
              </p>
            ),
          },
          {
            heading: "4. Plan changes",
            body: <p>Upgrading takes effect immediately, with the difference prorated for the remainder of your billing period. Downgrading takes effect at the start of your next billing period, so you keep access to your current plan&apos;s limits until then.</p>,
          },
          {
            heading: "5. Billing errors",
            body: <p>If you believe you were charged incorrectly — a duplicate charge, an incorrect plan, or a charge after cancellation — contact us and we&apos;ll investigate and refund confirmed errors in full.</p>,
          },
          {
            heading: "6. What happens to your data after cancellation",
            body: <p>Your account and data remain accessible in a read-only state for 30 days after cancellation, so you can export client records, bookings, and galleries. After 30 days, data is scheduled for deletion in line with our Privacy Policy.</p>,
          },
          {
            heading: "7. How to request a refund",
            body: <p>Email {SITE.supportEmail} with your studio name and the transaction in question. We aim to resolve refund requests within 5 business days.</p>,
          },
        ]}
      />
    </>
  );
}
