import { describe, expect, it } from "vitest";
import { breakpointForWidth, deviceClassForWidth, breakpoints } from "../tokens/breakpoints";

describe("breakpointForWidth", () => {
  it("resolves small mobile at 320px", () => {
    expect(breakpointForWidth(320)).toBe("base");
    expect(breakpointForWidth(374)).toBe("base");
  });

  it("resolves standard mobile at 375px", () => {
    expect(breakpointForWidth(375)).toBe("xs");
    expect(breakpointForWidth(639)).toBe("xs");
  });

  it("resolves tablet portrait at 640px", () => {
    expect(breakpointForWidth(640)).toBe("sm");
    expect(breakpointForWidth(767)).toBe("sm");
  });

  it("resolves tablet landscape at 768px", () => {
    expect(breakpointForWidth(768)).toBe("md");
    expect(breakpointForWidth(1023)).toBe("md");
  });

  it("resolves desktop at 1024px", () => {
    expect(breakpointForWidth(1024)).toBe("lg");
    expect(breakpointForWidth(1439)).toBe("lg");
  });

  it("resolves large desktop at 1440px", () => {
    expect(breakpointForWidth(1440)).toBe("xl");
    expect(breakpointForWidth(2560)).toBe("xl");
  });

  it("matches the documented breakpoints table", () => {
    expect(breakpoints).toEqual({ base: 0, xs: 375, sm: 640, md: 768, lg: 1024, xl: 1440 });
  });
});

describe("deviceClassForWidth", () => {
  it("classifies mobile below 640px", () => {
    expect(deviceClassForWidth(320)).toBe("mobile");
    expect(deviceClassForWidth(639)).toBe("mobile");
  });

  it("classifies tablet between 640 and 1023px", () => {
    expect(deviceClassForWidth(640)).toBe("tablet");
    expect(deviceClassForWidth(1023)).toBe("tablet");
  });

  it("classifies desktop at 1024px and up", () => {
    expect(deviceClassForWidth(1024)).toBe("desktop");
    expect(deviceClassForWidth(1440)).toBe("desktop");
  });
});
