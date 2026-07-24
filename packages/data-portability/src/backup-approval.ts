export type BackupOrRestoreStatus = "requested" | "pending_approval" | "approved" | "rejected" | "processing" | "completed" | "failed";

/**
 * "Encrypted full-studio backup and restore with Platform Admin
 * approval" — the one gate every backup and restore request passes
 * through: neither can move past `pending_approval` without a
 * `PlatformUser`'s explicit decision, and a studio's own staff (no
 * matter how senior their role within the studio) have no path to
 * approve their own request. This function only encodes the state
 * machine; `apps/api` is where "approved by must be a PlatformUser,
 * never a StudioUser" is actually enforced against real auth context.
 */
export function canApprove(status: BackupOrRestoreStatus): boolean {
  return status === "requested" || status === "pending_approval";
}

export function canProcess(status: BackupOrRestoreStatus): boolean {
  return status === "approved";
}
