import type { Metadata } from "next";
import { LegalPage } from "../../components/marketing/legal-page";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";
import { SITE } from "../../lib/content";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description: "The terms that govern use of BCP Studio OS.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Terms", path: "/terms" }])} />
      <LegalPage
        title="Terms of Service"
        effectiveDate="July 12, 2026"
        intro="These terms govern your use of BCP Studio OS. By creating a studio account, you agree to them on behalf of your business."
        sections={[
          {
            heading: "1. The service",
            body: <p>BCP Studio OS provides CRM, gallery, album selection, and related tools for photography studios, delivered as software-as-a-service on a subscription basis.</p>,
          },
          {
            heading: "2. Accounts and eligibility",
            body: (
              <p>
                You must be authorized to act on behalf of the business creating a studio account. You&apos;re
                responsible for the accuracy of information you provide and for maintaining the security of your
                account credentials.
              </p>
            ),
          },
          {
            heading: "3. Subscriptions, trials, and billing",
            body: (
              <>
                <p>
                  New studios start on a 14-day trial. Continued use after the trial requires an active paid
                  subscription on one of the published plans, billed monthly or yearly in advance.
                </p>
                <p>Plan limits (team members, branches, storage, and monthly usage of AI and messaging features) are enforced automatically and described on the Pricing page.</p>
              </>
            ),
          },
          {
            heading: "4. Zero commission",
            body: <p>We do not take a percentage of payments your studio collects from its own clients. Our fee is the flat subscription price for your plan.</p>,
          },
          {
            heading: "5. Your content and data",
            body: (
              <p>
                You retain ownership of the photos, client data, and business records you upload. You grant us a
                limited license to store, process, and display that content solely to operate the service on your
                behalf (e.g. generating galleries, sending notifications, running AI face search within your own
                galleries).
              </p>
            ),
          },
          {
            heading: "6. Acceptable use",
            body: (
              <ul className="list-disc pl-5">
                <li>Don&apos;t use the platform to upload content you don&apos;t have rights to, or to violate any client&apos;s privacy.</li>
                <li>Don&apos;t attempt to access another studio&apos;s data or circumvent plan limits or security controls.</li>
                <li>Don&apos;t use WhatsApp or email automation to send unsolicited messages outside your own client relationships.</li>
              </ul>
            ),
          },
          {
            heading: "7. White-label domains",
            body: <p>You&apos;re responsible for owning or controlling any custom domain you connect. We verify domain ownership before activation and may suspend a domain that fails verification or is used to impersonate another party.</p>,
          },
          {
            heading: "8. Termination",
            body: <p>You may cancel at any time from Settings. We may suspend or terminate accounts that violate these terms, with notice where practical. See our Refund Policy for what happens to billing and data on cancellation.</p>,
          },
          {
            heading: "9. Disclaimers and limitation of liability",
            body: <p>The service is provided &quot;as is.&quot; To the extent permitted by law, we are not liable for indirect or consequential damages arising from use of the platform, including loss of business or data, beyond amounts paid for the service in the preceding 12 months.</p>,
          },
          {
            heading: "10. Changes to these terms",
            body: <p>We may update these terms from time to time. Material changes will be communicated to studio owners by email before taking effect.</p>,
          },
          {
            heading: "11. Contact",
            body: <p>Questions about these terms can be sent to {SITE.supportEmail}.</p>,
          },
        ]}
      />
    </>
  );
}
