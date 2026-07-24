export interface ContractForSigningCheck {
  status: string;
  witnessRequired: boolean;
  witnessSignedAt: Date | null;
  signerOtpVerifiedAt: Date | null;
}

/**
 * A contract is only truly signed once the client's own OTP
 * verification has landed, and — when the template calls for one — the
 * witness has separately signed too. `apps/api`'s signing flow checks
 * this before ever marking `ClientContract.status = "signed"`, so
 * "signed" always means every required party genuinely completed their
 * step, not just that the client typed a name.
 */
export function isReadyToFinalize(contract: ContractForSigningCheck): boolean {
  if (!contract.signerOtpVerifiedAt) return false;
  if (contract.witnessRequired && !contract.witnessSignedAt) return false;
  return true;
}

export function canRequestOtp(status: string): boolean {
  return status === "sent" || status === "draft";
}
