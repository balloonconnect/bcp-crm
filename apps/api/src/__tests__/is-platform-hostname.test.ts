import { describe, expect, it } from "vitest";
import { isPlatformHostname } from "../lib/is-platform-hostname";

const PLATFORM_HOSTS = ["localhost", "bcpstudio.os"];

describe("isPlatformHostname", () => {
  it("matches an exact platform hostname", () => {
    expect(isPlatformHostname("bcpstudio.os", PLATFORM_HOSTS)).toBe(true);
    expect(isPlatformHostname("localhost", PLATFORM_HOSTS)).toBe(true);
  });

  it("matches a subdomain of a platform hostname", () => {
    expect(isPlatformHostname("app.bcpstudio.os", PLATFORM_HOSTS)).toBe(true);
    expect(isPlatformHostname("api.bcpstudio.os", PLATFORM_HOSTS)).toBe(true);
  });

  it("does not match an unrelated domain", () => {
    expect(isPlatformHostname("studio.example.com", PLATFORM_HOSTS)).toBe(false);
  });

  it("does not match a domain that merely contains the platform host as a substring", () => {
    expect(isPlatformHostname("notbcpstudio.os", PLATFORM_HOSTS)).toBe(false);
    expect(isPlatformHostname("bcpstudio.os.evil.com", PLATFORM_HOSTS)).toBe(false);
  });
});
