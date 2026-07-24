const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; errors?: string[] };
}

/** Every call here hits an unauthenticated `/public/*` endpoint — no token, no cookie. `cache: "no-store"` since a studio's shared content (form config, quotation status) can change and this is server-rendered per-request. */
export async function publicApiFetch<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });
  return (await res.json().catch(() => ({ ok: false, error: { code: "PARSE_ERROR", message: "Invalid response" } }))) as ApiEnvelope<T>;
}
