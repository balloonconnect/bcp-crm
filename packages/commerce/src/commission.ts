export interface PlatformCommerceSettingsShape {
  commissionEnabled: boolean;
  commissionPercent: number;
}

/** "Use zero platform commission by default. Keep future platform fee support configurable." — the one function every order's commission is resolved through. Disabled (the default) always resolves to a hard 0, regardless of whatever `commissionPercent` value happens to be stored — a platform admin can raise the percentage in advance of actually turning it on without any order being affected until `commissionEnabled` itself flips. */
export function resolveCommissionPercent(settings: PlatformCommerceSettingsShape): number {
  return settings.commissionEnabled ? settings.commissionPercent : 0;
}
