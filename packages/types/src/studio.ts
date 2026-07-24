/**
 * Lightweight app-facing view of a Studio (the tenant). Mirrors
 * @bcp/database's Studio model at a distance — this package has no
 * dependency on Prisma, so it's the type apps import when they only need
 * the shape, not a live query.
 */
export interface Studio {
  id: string;
  slug: string;
  name: string;
  planId: string;
  status: "trial" | "active" | "grace" | "suspended" | "expired" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export type StudioId = Studio["id"];
