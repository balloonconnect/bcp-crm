import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicApiFetch } from "../../../lib/api";
import { getStudioThemeStyle } from "../../../lib/theme";
import { QuotationView } from "../../../components/quotation/quotation-view";

interface QuotationResolution {
  studioName: string;
  studioSlug: string;
  view: {
    quotationNumber: string;
    status: string;
    subtotal: number;
    discountAmount: number;
    gstRatePercent: number;
    gstAmount: number;
    totalAmount: number;
    termsText?: string;
    validUntil?: string;
    lineItems: { name: string; quantity: number; unitPrice?: number; lineTotal?: number }[];
    paymentSchedule: { label: string; percentage: number; amount: number; trigger: string }[];
    itemLevelPricingShown: boolean;
  };
}

interface PageProps {
  params: { token: string };
}

async function loadQuotation(token: string) {
  const res = await publicApiFetch<QuotationResolution>(`/public/quotations/${token}`);
  if (!res.ok || !res.data) return null;
  return res.data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolution = await loadQuotation(params.token);
  return {
    title: resolution ? `Quotation ${resolution.view.quotationNumber} — ${resolution.studioName}` : "Quotation",
    robots: { index: false, follow: false },
  };
}

export default async function PublicQuotationPage({ params }: PageProps) {
  const resolution = await loadQuotation(params.token);
  if (!resolution) notFound();

  const { style } = await getStudioThemeStyle(resolution.studioSlug);

  return (
    <main style={style} className="min-h-screen bg-background pb-28 sm:pb-10">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <QuotationView token={params.token} studioName={resolution.studioName} initialView={resolution.view} />
      </div>
    </main>
  );
}
