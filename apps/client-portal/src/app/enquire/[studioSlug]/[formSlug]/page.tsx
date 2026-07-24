import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicApiFetch } from "../../../../lib/api";
import { getStudioThemeStyle } from "../../../../lib/theme";
import { PublicEnquiryForm } from "../../../../components/enquiry-form/public-enquiry-form";

interface FormResolution {
  form: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    coverImageUrl: string | null;
    formFieldsConfig: Record<string, string>;
    eventTypes: string[];
    contactMethods: string[];
    consentRequired: boolean;
    consentText: string;
    termsUrl: string | null;
    termsText: string | null;
  };
  studioName: string | null;
}

interface PageProps {
  params: { studioSlug: string; formSlug: string };
}

async function loadForm(studioSlug: string, formSlug: string) {
  const res = await publicApiFetch<FormResolution>(`/public/enquiry-forms/${formSlug}?studioSlug=${encodeURIComponent(studioSlug)}`);
  if (!res.ok || !res.data) return null;
  return res.data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolution = await loadForm(params.studioSlug, params.formSlug);
  if (!resolution) return { title: "Enquiry form" };
  return {
    title: `${resolution.form.title} — ${resolution.studioName ?? "Enquiry form"}`,
    description: resolution.form.description ?? undefined,
    robots: { index: false, follow: false }, // a lead-capture form isn't content worth indexing, and indexing could expose it to scraping
  };
}

export default async function PublicEnquiryFormPage({ params }: PageProps) {
  const [resolution, { style }] = await Promise.all([loadForm(params.studioSlug, params.formSlug), getStudioThemeStyle(params.studioSlug)]);

  if (!resolution) notFound();

  return (
    <main style={style} className="flex min-h-screen justify-center bg-background px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl">
        <PublicEnquiryForm form={resolution.form} studioSlug={params.studioSlug} studioName={resolution.studioName} />
      </div>
    </main>
  );
}
