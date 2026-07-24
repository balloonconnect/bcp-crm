/** The 5 notification channels named in the brief. */
export const NOTIFICATION_CHANNELS = ["in_app", "email", "whatsapp", "browser_push", "pwa_push"] as const;
export type NotificationChannelKey = (typeof NOTIFICATION_CHANNELS)[number];

export interface ChannelPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  browserPushEnabled: boolean;
  pwaPushEnabled: boolean;
}

/** The default preference set for a user who's never configured one — matches `NotificationPreference`'s own column defaults, kept here too so `apps/api` can resolve "what would this user's preferences be" without necessarily having created a database row for them yet (a row is only created once a user actually changes something from the default, not proactively for every new user). */
export const DEFAULT_CHANNEL_PREFERENCES: ChannelPreferences = {
  inAppEnabled: true,
  emailEnabled: true,
  whatsappEnabled: false,
  browserPushEnabled: false,
  pwaPushEnabled: false,
};

const CHANNEL_TO_PREFERENCE_KEY: Record<NotificationChannelKey, keyof ChannelPreferences> = {
  in_app: "inAppEnabled",
  email: "emailEnabled",
  whatsapp: "whatsappEnabled",
  browser_push: "browserPushEnabled",
  pwa_push: "pwaPushEnabled",
};

/** Whether a specific channel should actually be used for this user right now — the one function that turns "user preferences" into a real dispatch decision. */
export function isChannelEnabled(preferences: ChannelPreferences, channel: NotificationChannelKey): boolean {
  return preferences[CHANNEL_TO_PREFERENCE_KEY[channel]];
}

/** Given a notification that could go out on several channels (e.g. "notify in-app and by email"), returns only the ones this user actually wants — the in-app channel is treated as always-on regardless of preference, since suppressing a user's own notification center would hide the notification everywhere with no way to ever see it. */
export function resolveEnabledChannels(preferences: ChannelPreferences, candidateChannels: NotificationChannelKey[]): NotificationChannelKey[] {
  return candidateChannels.filter((channel) => channel === "in_app" || isChannelEnabled(preferences, channel));
}
