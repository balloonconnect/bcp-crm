import { z } from "zod";

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const signUpSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  studioSlug: z.string().optional(),
});

export const emailOnlySchema = z.object({
  email: z.string().email(),
});

export const verifyEmailConfirmSchema = z.object({
  token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  studioSlug: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const otpRequestSchema = z.object({
  email: z.string().email(),
  studioSlug: z.string().optional(),
});

export const otpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d+$/),
  studioSlug: z.string().optional(),
});

export const twoFactorChallengeSchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().min(6).max(9),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2).max(120),
  password: passwordSchema,
});

export const twoFactorVerifySchema = z.object({
  code: z.string().min(6).max(9), // 6-digit TOTP or an 8-char XXXX-XXXX recovery code
});

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const revokeSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export const googleCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
