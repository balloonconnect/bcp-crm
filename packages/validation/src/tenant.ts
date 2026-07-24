import { z } from "zod";

export const createTenantSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens"),
  planId: z.string().min(1),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
