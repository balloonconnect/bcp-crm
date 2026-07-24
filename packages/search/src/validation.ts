import { z } from "zod";

export const searchQuerySchema = z.object({ query: z.string().min(1).max(200), entityTypes: z.array(z.string()).optional() });
export const saveSearchSchema = z.object({ name: z.string().min(1).max(200), query: z.string().min(1).max(200), entityTypes: z.array(z.string()).optional() });
export const naturalLanguageSearchSchema = z.object({ query: z.string().min(1).max(500) });
