"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; [key: string]: unknown };
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<boolean> {
  const res = await fetch(`${API_URL}/platform-auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return false;
  const body = (await res.json()) as ApiEnvelope<{ accessToken: string }>;
  if (body.ok && body.data) {
    setAccessToken(body.data.accessToken);
    return true;
  }
  return false;
}

/**
 * All platform-admin API calls go through this — it attaches the current
 * access token, transparently refreshes once on a 401 (the refresh token
 * itself lives in an httpOnly cookie the browser sends automatically, per
 * `credentials: "include"`), and normalizes the `{ ok, data, error }`
 * envelope every API route returns.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  _retried = false,
): Promise<ApiEnvelope<T>> {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include" });

  if (res.status === 401 && !_retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetch<T>(path, options, true);
  }

  const body = (await res.json().catch(() => ({ ok: false, error: { code: "PARSE_ERROR", message: "Invalid response" } }))) as ApiEnvelope<T>;
  return body;
}

export function apiGet<T>(path: string): Promise<ApiEnvelope<T>> {
  return apiFetch<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>> {
  return apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>> {
  return apiFetch<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
}

export function apiPut<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>> {
  return apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined });
}

export function apiDelete<T>(path: string): Promise<ApiEnvelope<T>> {
  return apiFetch<T>(path, { method: "DELETE" });
}
