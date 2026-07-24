import { describe, expect, it } from "vitest";
import { isReadyToFinalize, canRequestOtp } from "../signing";

describe("isReadyToFinalize", () => {
  it("is not ready without OTP verification", () => {
    expect(isReadyToFinalize({ status: "sent", witnessRequired: false, witnessSignedAt: null, signerOtpVerifiedAt: null })).toBe(false);
  });

  it("is ready once OTP is verified and no witness is required", () => {
    expect(isReadyToFinalize({ status: "sent", witnessRequired: false, witnessSignedAt: null, signerOtpVerifiedAt: new Date() })).toBe(true);
  });

  it("requires the witness to have separately signed when required", () => {
    expect(isReadyToFinalize({ status: "sent", witnessRequired: true, witnessSignedAt: null, signerOtpVerifiedAt: new Date() })).toBe(false);
  });

  it("is ready once both the signer's OTP and the witness are done", () => {
    expect(isReadyToFinalize({ status: "sent", witnessRequired: true, witnessSignedAt: new Date(), signerOtpVerifiedAt: new Date() })).toBe(true);
  });
});

describe("canRequestOtp", () => {
  it("allows requesting OTP for a draft or sent contract", () => {
    expect(canRequestOtp("draft")).toBe(true);
    expect(canRequestOtp("sent")).toBe(true);
  });

  it("does not allow requesting OTP for an already-signed contract", () => {
    expect(canRequestOtp("signed")).toBe(false);
  });
});
