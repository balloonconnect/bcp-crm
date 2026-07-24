import type { ApiEnvelope } from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Every authenticated portal call carries the session token as a bare Bearer header — no cookies, no studio-staff JWT machinery, since a client portal session is a genuinely different kind of actor from a StudioUser login. */
export async function portalApiFetch<T>(path: string, sessionToken: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${sessionToken}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });
  return (await res.json().catch(() => ({ ok: false, error: { code: "PARSE_ERROR", message: "Invalid response" } }))) as ApiEnvelope<T>;
}
