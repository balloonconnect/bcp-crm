export type EAlbumAccessResult = "granted" | "needs_password" | "needs_otp";

export interface EAlbumAccessConfig {
  passwordHash: string | null;
  otpRequired: boolean;
}

export interface EAlbumSessionState {
  passwordVerified: boolean;
  otpVerified: boolean;
}

/** The e-album's own access gate — password checked before OTP, same fixed order `@bcp/gallery`'s `checkGalleryAccess()` uses, kept as an independent function since the e-album has no expiry concept the way a gallery link does. */
export function checkEAlbumAccess(config: EAlbumAccessConfig, session: EAlbumSessionState | null): EAlbumAccessResult {
  if (config.passwordHash && !session?.passwordVerified) return "needs_password";
  if (config.otpRequired && !session?.otpVerified) return "needs_otp";
  return "granted";
}
