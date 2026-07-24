export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

/** Pulls the 5 standard UTM parameters from a URL's query string — pure, framework-agnostic (works from a Next.js `useSearchParams()` or a plain `URLSearchParams`). */
export function parseUtmParams(searchParams: URLSearchParams): UtmParams {
  const utm: UtmParams = {};
  const source = searchParams.get("utm_source");
  const medium = searchParams.get("utm_medium");
  const campaign = searchParams.get("utm_campaign");
  const term = searchParams.get("utm_term");
  const content = searchParams.get("utm_content");

  if (source) utm.source = source;
  if (medium) utm.medium = medium;
  if (campaign) utm.campaign = campaign;
  if (term) utm.term = term;
  if (content) utm.content = content;

  return utm;
}
