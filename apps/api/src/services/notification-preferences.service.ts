import { prisma } from "@bcp/database";
import { DEFAULT_CHANNEL_PREFERENCES, resolveEnabledChannels, type NotificationChannelKey } from "@bcp/notifications";

export async function getPreferences(studioId: string, studioUserId: string) {
  const existing = await prisma.notificationPreference.findFirst({ where: { studioId, studioUserId } });
  if (existing) return existing;
  return { ...DEFAULT_CHANNEL_PREFERENCES, studioId, studioUserId };
}

export interface PreferencesInput {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  whatsappEnabled?: boolean;
  browserPushEnabled?: boolean;
  pwaPushEnabled?: boolean;
}

export async function updatePreferences(studioId: string, studioUserId: string, input: PreferencesInput) {
  return prisma.notificationPreference.upsert({
    where: { studioUserId },
    update: input,
    create: { studioId, studioUserId, ...DEFAULT_CHANNEL_PREFERENCES, ...input },
  });
}

/** Resolves which channels a notification should actually dispatch on for this user — combines their stored (or default) preferences with the candidate channels the caller proposes. */
export async function resolveDispatchChannels(studioId: string, studioUserId: string, candidateChannels: NotificationChannelKey[]) {
  const prefs = await getPreferences(studioId, studioUserId);
  return resolveEnabledChannels(prefs, candidateChannels);
}
