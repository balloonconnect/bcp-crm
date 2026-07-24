import { z } from "zod";

export const sendMessageSchema = z.object({ conversationId: z.string().uuid().optional(), content: z.string().min(1).max(4000) });
export const confirmActionSchema = z.object({ actionId: z.string().uuid() });
export const rejectActionSchema = z.object({ actionId: z.string().uuid() });
export const reverseActionSchema = z.object({ actionId: z.string().uuid() });
