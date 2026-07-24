import { describe, expect, it } from "vitest";
import { assertConsented, ConsentRequiredError } from "../consent";

describe("assertConsented", () => {
  it("passes silently when consent was recorded", () => {
    expect(() => assertConsented(new Date())).not.toThrow();
  });

  it("throws when consent was never recorded", () => {
    expect(() => assertConsented(null)).toThrow(ConsentRequiredError);
  });
});
