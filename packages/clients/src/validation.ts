import { z } from "zod";

export const clientInputSchema = z.object({
  name: z.string().min(1).max(160),
  brideName: z.string().max(160).optional(),
  groomName: z.string().max(160).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  notes: z.string().max(5000).optional(),

  instagramProfile1: z.string().max(160).optional(),
  instagramProfile2: z.string().max(160).optional(),
  facebookProfile: z.string().max(160).optional(),

  billingAddressLine1: z.string().max(200).optional(),
  billingAddressLine2: z.string().max(200).optional(),
  billingCity: z.string().max(100).optional(),
  billingState: z.string().max(100).optional(),
  billingPostalCode: z.string().max(20).optional(),
  billingCountry: z.string().length(2).optional(),

  shippingSameAsBilling: z.boolean().optional(),
  shippingAddressLine1: z.string().max(200).optional(),
  shippingAddressLine2: z.string().max(200).optional(),
  shippingCity: z.string().max(100).optional(),
  shippingState: z.string().max(100).optional(),
  shippingPostalCode: z.string().max(20).optional(),
  shippingCountry: z.string().length(2).optional(),

  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/, "not a valid GSTIN")
    .optional(),
  gstLegalName: z.string().max(160).optional(),

  anniversaryDate: z.string().datetime().optional(),
  brideBirthday: z.string().datetime().optional(),
  groomBirthday: z.string().datetime().optional(),
  otherImportantDates: z.array(z.object({ label: z.string().max(100), date: z.string().datetime() })).max(20).optional(),

  tags: z.array(z.string().min(1).max(40)).max(30).optional(),

  referredById: z.string().uuid().optional(),
  referralNotes: z.string().max(1000).optional(),
});

export const clientUpdateSchema = clientInputSchema.partial();

export const familyContactSchema = z.object({
  name: z.string().min(1).max(160),
  relationship: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
});

export const clientCommunicationSchema = z.object({
  channel: z.enum(["call", "email", "whatsapp", "sms", "meeting", "other"]),
  direction: z.enum(["inbound", "outbound"]),
  summary: z.string().min(1).max(2000),
  occurredAt: z.string().datetime(),
});

export const contractSchema = z.object({
  title: z.string().min(1).max(200),
  eventId: z.string().uuid().optional(),
  status: z.enum(["draft", "sent", "signed", "void"]).optional(),
});

export const feedbackSchema = z.object({
  eventId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});
