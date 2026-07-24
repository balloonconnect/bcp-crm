import { describe, expect, it } from "vitest";
import { hexToRgb, rgbToHsl, hexToHsl, hexToHslTriplet, relativeLuminance, readableForegroundFor } from "../colors";

describe("hexToRgb", () => {
  it("parses a 6-digit hex color", () => {
    expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("expands a 3-digit hex color", () => {
    expect(hexToRgb("#FFF")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("throws on an invalid hex string", () => {
    expect(() => hexToRgb("not-a-color")).toThrow();
  });
});

describe("rgbToHsl / hexToHsl", () => {
  it("converts pure white to 0% saturation, 100% lightness", () => {
    expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 });
  });

  it("converts pure black to 0% lightness", () => {
    expect(rgbToHsl({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, l: 0 });
  });

  it("converts a known red", () => {
    const hsl = hexToHsl("#FF0000");
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });
});

describe("hexToHslTriplet", () => {
  it("formats as 'H S% L%'", () => {
    expect(hexToHslTriplet("#FF0000")).toBe("0 100% 50%");
  });
});

describe("relativeLuminance", () => {
  it("white has luminance 1, black has luminance 0", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
  });
});

describe("readableForegroundFor", () => {
  it("picks black text on a light background", () => {
    expect(readableForegroundFor("#FFFFFF")).toBe("#000000");
  });

  it("picks white text on a dark background", () => {
    expect(readableForegroundFor("#14161A")).toBe("#FFFFFF");
  });
});
