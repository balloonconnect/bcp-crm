/** SHA-256 over the file's bytes via the Web Crypto API — computed entirely client-side before any upload starts, since duplicate detection needs the checksum before the server sees a single byte. */
export async function computeFileChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Best-effort Wi-Fi detection via the Network Information API (Chrome/Edge/Android only — Safari and Firefox don't implement it). When unavailable, treats the connection as "unknown," which the caller lets through rather than blocking uploads on browsers that can't report their network type. */
export function isOnWifi(): boolean | null {
  const connection = (navigator as unknown as { connection?: { type?: string; effectiveType?: string } }).connection;
  if (!connection) return null;
  if (connection.type) return connection.type === "wifi";
  if (connection.effectiveType) return connection.effectiveType === "4g"; // closest available proxy when .type isn't reported
  return null;
}
