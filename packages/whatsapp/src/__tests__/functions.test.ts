import { describe, expect, it } from "vitest";
import { WHATSAPP_FUNCTIONS } from "../functions";

describe("WHATSAPP_FUNCTIONS", () => {
  it("has exactly the 14 functions named in the brief", () => {
    expect(WHATSAPP_FUNCTIONS.length).toBe(14);
  });

  it("has unique keys", () => {
    expect(new Set(WHATSAPP_FUNCTIONS.map((f) => f.key)).size).toBe(14);
  });

  it("marks text_message and image as not needing a template", () => {
    expect(WHATSAPP_FUNCTIONS.find((f) => f.key === "text_message")?.needsTemplate).toBe(false);
    expect(WHATSAPP_FUNCTIONS.find((f) => f.key === "image")?.needsTemplate).toBe(false);
  });

  it("marks booking_confirmation as needing a template", () => {
    expect(WHATSAPP_FUNCTIONS.find((f) => f.key === "booking_confirmation")?.needsTemplate).toBe(true);
  });
});
