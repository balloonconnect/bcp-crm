/** Mirrors @bcp/database's ActorType enum without depending on Prisma. */
export type ActorType = "platform_user" | "studio_user" | "api_key" | "system";

/** Minimal shape of an authenticated actor, as loaded by the caller from the database. */
export interface AuthenticatedActor {
  id: string;
  actorType: ActorType;
  studioId: string | null;
  email: string;
  status: string;
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  passwordHash: string | null;
}
