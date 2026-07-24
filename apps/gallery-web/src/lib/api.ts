const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; errors?: string[] };
}

/** Every call here hits an unauthenticated `/public/*` endpoint — no studio session, just the gallery's own token plus a guest token. Same shape as `apps/client-portal`'s `publicApiFetch`. */
export async function publicApiFetch<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });
  return (await res.json().catch(() => ({ ok: false, error: { code: "PARSE_ERROR", message: "Invalid response" } }))) as ApiEnvelope<T>;
}

export function publicImageUrl(token: string, photoId: string, guestToken: string, purpose: "view" | "download_original" | "download_compressed" = "view"): string {
  return `${API_URL}/public/galleries/${token}/photos/${photoId}/image?guestToken=${encodeURIComponent(guestToken)}&purpose=${purpose}`;
}
