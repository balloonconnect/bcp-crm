/** True if `hostname` is (or is a subdomain of) one of the platform's own hostnames — these never go through custom-domain resolution. */
export function isPlatformHostname(hostname: string, platformHostnames: string[]): boolean {
  return platformHostnames.some((base) => hostname === base || hostname.endsWith(`.${base}`));
}
