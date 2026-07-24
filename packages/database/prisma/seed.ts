import { randomBytes } from "node:crypto";
import { PrismaClient } from "../generated/client";
import {
  PLATFORM_PERMISSIONS,
  PLATFORM_ROLE_DEFINITIONS,
  STUDIO_PERMISSIONS,
  STUDIO_ROLE_DEFINITIONS,
} from "@bcp/permissions";
import { PLAN_DEFINITIONS, PLAN_KEYS } from "@bcp/billing";

const prisma = new PrismaClient();

/**
 * Seed data covers three things:
 *  1. Global catalogs every environment needs — the platform + studio
 *     role/permission catalog (imported from @bcp/permissions, the single
 *     source of truth — see that package's catalog.ts) and subscription plans.
 *  2. One platform staff account (Super Admin) so platform-admin is usable
 *     immediately.
 *  3. One realistic demo studio (Balloon Connect Photography) with
 *     branches, all 11 system roles, a couple of users, a trial→active
 *     one-year subscription, and a license key — enough to exercise every
 *     model in this schema end to end.
 *  4. A full business-data layer for that same demo studio — leads through
 *     a realistic funnel, clients, packages, quotations, bookings, events,
 *     invoices/payments, expenses, galleries with AI photo-analysis results,
 *     an album selection, an automation rule, and an AI Marketing Studio
 *     example — gated behind `shouldSeedDemoBusinessData()` so it never
 *     runs in production unless `SEED_DEMO_DATA=true` is set explicitly.
 *
 * Idempotent: every `upsert` is keyed off a natural unique field, so
 * `pnpm db:seed` is safe to re-run.
 */

function generateKey(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString("hex")}`;
}

async function seedPlatformCatalog() {
  await Promise.all(
    PLATFORM_PERMISSIONS.map((p) =>
      prisma.platformPermission.upsert({
        where: { key: p.key },
        update: { label: p.label, category: p.category },
        create: p,
      }),
    ),
  );

  const roleByKey = new Map<string, string>();
  for (const [key, def] of Object.entries(PLATFORM_ROLE_DEFINITIONS)) {
    const role = await prisma.platformRole.upsert({
      where: { key },
      update: { name: def.name, description: def.description, permissions: def.permissions },
      create: { key, name: def.name, description: def.description, isSystem: true, permissions: def.permissions },
    });
    roleByKey.set(key, role.id);
  }

  const superAdmin = await prisma.platformUser.upsert({
    where: { email: "ops@bcpstudio.os" },
    update: {},
    create: {
      email: "ops@bcpstudio.os",
      passwordHash: "$argon2id$dev$seed$placeholder", // replaced by a real hash outside seed data
      name: "BCP Studio OS Ops",
      status: "active",
      emailVerifiedAt: new Date(),
    },
  });

  const superAdminRoleId = roleByKey.get("super_admin")!;
  await prisma.platformUserRole.upsert({
    where: { platformUserId_platformRoleId: { platformUserId: superAdmin.id, platformRoleId: superAdminRoleId } },
    update: {},
    create: { platformUserId: superAdmin.id, platformRoleId: superAdminRoleId },
  });

  return { superAdmin };
}

async function seedSubscriptionPlans() {
  const plans = PLAN_KEYS.map((key) => {
    const def = PLAN_DEFINITIONS[key];
    return {
      key: def.key,
      name: def.name,
      description: def.description,
      priceMonthly: def.priceMonthly,
      priceYearly: def.priceYearly,
      limits: def.limits,
      features: {
        whatsapp_automation: (def.limits.maxWhatsappMessagesPerMonth ?? 0) > 0 || def.limits.maxWhatsappMessagesPerMonth === null,
        custom_domain: (def.limits.maxCustomDomains ?? 0) > 0 || def.limits.maxCustomDomains === null,
        ai_tools:
          (def.limits.maxAiAnalysisJobsPerMonth ?? 0) > 0 ||
          def.limits.maxAiAnalysisJobsPerMonth === null ||
          (def.limits.maxAiFaceSearchesPerMonth ?? 0) > 0 ||
          def.limits.maxAiFaceSearchesPerMonth === null,
        sso: def.key === "enterprise" || def.key === "custom",
      },
    };
  });

  return Promise.all(
    plans.map((plan) =>
      prisma.subscriptionPlan.upsert({
        where: { key: plan.key },
        update: plan as never,
        create: plan as never,
      }),
    ),
  );
}

async function seedFeatureFlagDefaults() {
  const defaults = [
    { key: "ai_tools", enabled: false, name: "AI-powered tools" },
    { key: "whatsapp_automation", enabled: false, name: "WhatsApp automation" },
    { key: "custom_domain", enabled: false, name: "Custom domain support" },
  ];

  for (const flag of defaults) {
    const existing = await prisma.featureFlag.findFirst({ where: { studioId: null, key: flag.key } });
    if (existing) {
      await prisma.featureFlag.update({ where: { id: existing.id }, data: flag });
    } else {
      await prisma.featureFlag.create({ data: { ...flag, studioId: null } });
    }
  }
}

async function seedDemoStudio(platformOwnerId: string, studioPlanId: string) {
  const studio = await prisma.studio.upsert({
    where: { slug: "balloon-connect-photography" },
    update: {},
    create: {
      slug: "balloon-connect-photography",
      name: "Balloon Connect Photography",
      status: "active",
      timezone: "Asia/Kolkata",
      country: "IN",
      currency: "INR",
      createdBy: platformOwnerId,
      brand: {
        create: {
          displayName: "Balloon Connect Photography",
          legalBusinessName: "Balloon Connect Photography Pvt. Ltd.",
          primaryColor: "#14161A",
          accentColor: "#E8A33D",
          secondaryColor: "#71717A",
          backgroundColor: "#F7F7F8",
          textColor: "#14161A",
          fontFamilyBody: "Inter",
          fontFamilyHeading: "Inter",
          borderRadius: 10,
          buttonStyle: "solid",
          cardStyle: "elevated",
          emailFromName: "Balloon Connect Photography",
          whatsappDisplayName: "Balloon Connect",
          whatsappNumber: "+919845011223",
          supportEmail: "hello@balloonconnect.studio",
          copyrightText: "© 2026 Balloon Connect Photography. All rights reserved.",
          socialLinks: [
            { platform: "instagram", url: "https://instagram.com/balloon_connect_photography" },
          ],
          poweredByVisible: true,
        },
      },
    },
  });

  const [bangalore, coimbatore] = await Promise.all([
    prisma.studioBranch.upsert({
      where: { studioId_code: { studioId: studio.id, code: "BLR" } },
      update: {},
      create: {
        studioId: studio.id,
        name: "Bangalore — Indiranagar",
        code: "BLR",
        city: "Bengaluru",
        state: "Karnataka",
        isPrimary: true,
      },
    }),
    prisma.studioBranch.upsert({
      where: { studioId_code: { studioId: studio.id, code: "CBE" } },
      update: {},
      create: {
        studioId: studio.id,
        name: "Coimbatore — RS Puram",
        code: "CBE",
        city: "Coimbatore",
        state: "Tamil Nadu",
      },
    }),
  ]);

  // Studio permission catalog + all 11 system roles, from @bcp/permissions.
  await Promise.all(
    STUDIO_PERMISSIONS.map((p) =>
      prisma.studioPermission.upsert({ where: { key: p.key }, update: { label: p.label, category: p.category }, create: p }),
    ),
  );

  const roleByKey = new Map<string, string>();
  for (const [key, def] of Object.entries(STUDIO_ROLE_DEFINITIONS)) {
    const role = await prisma.studioRole.upsert({
      where: { studioId_key: { studioId: studio.id, key } },
      update: { permissions: def.permissions },
      create: { studioId: studio.id, key, name: def.name, description: def.description, isSystem: true, permissions: def.permissions },
    });
    roleByKey.set(key, role.id);
  }

  const owner = await prisma.studioUser.upsert({
    where: { studioId_email: { studioId: studio.id, email: "vignesh@balloonconnect.studio" } },
    update: {},
    create: {
      studioId: studio.id,
      branchId: bangalore.id,
      email: "vignesh@balloonconnect.studio",
      passwordHash: "$argon2id$dev$seed$placeholder",
      name: "Vignesh Kumar",
      status: "active",
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.studioUserRole.upsert({
    where: { studioUserId_studioRoleId: { studioUserId: owner.id, studioRoleId: roleByKey.get("owner")! } },
    update: {},
    create: { studioUserId: owner.id, studioRoleId: roleByKey.get("owner")! },
  });

  const photographer = await prisma.studioUser.upsert({
    where: { studioId_email: { studioId: studio.id, email: "photographer@balloonconnect.studio" } },
    update: {},
    create: {
      studioId: studio.id,
      branchId: coimbatore.id,
      email: "photographer@balloonconnect.studio",
      name: "Arun Photography",
      status: "invited",
    },
  });

  await prisma.studioUserRole.upsert({
    where: {
      studioUserId_studioRoleId: { studioUserId: photographer.id, studioRoleId: roleByKey.get("photographer")! },
    },
    update: {},
    create: { studioUserId: photographer.id, studioRoleId: roleByKey.get("photographer")! },
  });

  const accountant = await prisma.studioUser.upsert({
    where: { studioId_email: { studioId: studio.id, email: "accounts@balloonconnect.studio" } },
    update: {},
    create: {
      studioId: studio.id,
      branchId: null, // works across both branches
      email: "accounts@balloonconnect.studio",
      name: "Meera Iyer",
      status: "invited",
    },
  });

  await prisma.studioUserRole.upsert({
    where: {
      studioUserId_studioRoleId: { studioUserId: accountant.id, studioRoleId: roleByKey.get("accountant")! },
    },
    update: {},
    create: { studioUserId: accountant.id, studioRoleId: roleByKey.get("accountant")! },
  });

  // One-year trial → active subscription, with a matching license key.
  const now = new Date();
  const oneYearFromNow = new Date(now);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const existingSubscription = await prisma.subscription.findFirst({ where: { studioId: studio.id, status: "active" } });
  const subscription =
    existingSubscription ??
    (await prisma.subscription.create({
      data: {
        studioId: studio.id,
        planId: studioPlanId,
        status: "active",
        billingCycle: "yearly",
        seats: 10,
        startsAt: now,
        endsAt: oneYearFromNow,
        createdBy: platformOwnerId,
      },
    }));

  const existingLicense = await prisma.licenseKey.findFirst({ where: { studioId: studio.id } });
  if (!existingLicense) {
    await prisma.licenseKey.create({
      data: {
        studioId: studio.id,
        subscriptionId: subscription.id,
        key: generateKey("bcp_lic"),
        tier: "professional",
        status: "active",
        issuedAt: now,
        expiresAt: oneYearFromNow,
        seatsAllowed: 10,
        maxActivations: 3,
        allowedDomains: ["gallery.balloonconnect.studio"],
        createdBy: platformOwnerId,
      },
    });
  }

  const existingOverride = await prisma.featureFlag.findFirst({ where: { studioId: studio.id, key: "whatsapp_automation" } });
  if (!existingOverride) {
    await prisma.featureFlag.create({
      data: { studioId: studio.id, key: "whatsapp_automation", enabled: true, name: "WhatsApp automation", createdBy: platformOwnerId },
    });
  }

  // A fully verified + activated custom domain for the gallery surface,
  // demonstrating the custom-domain lifecycle end to end.
  await prisma.studioDomain.upsert({
    where: { domain: "gallery.balloonconnect.studio" },
    update: {},
    create: {
      studioId: studio.id,
      domain: "gallery.balloonconnect.studio",
      purpose: "gallery",
      status: "active",
      isPrimary: true,
      verificationMethod: "cname",
      cnameTarget: "domains.bcpstudio.os",
      verifiedAt: now,
      sslStatus: "issued",
      sslIssuedAt: now,
      sslExpiresAt: oneYearFromNow,
      activatedAt: now,
      createdBy: platformOwnerId,
    },
  });

  return { studio, owner, branches: [bangalore, coimbatore] };
}

/**
 * "Demo data must not run in production unless explicitly enabled" —
 * the one gate every function below is checked against. Platform
 * catalogs and subscription plans (seedPlatformCatalog/
 * seedSubscriptionPlans, above) are real, always-needed reference
 * data and always seed regardless of environment; the demo studio's
 * *business* data (leads, clients, invoices, and everything below)
 * is what this guards.
 */
function shouldSeedDemoBusinessData(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.SEED_DEMO_DATA === "true";
}

/**
 * The full business-data layer for the demo studio — leads through
 * reports-worthy history. Every `upsert`/idempotent-create pattern
 * here matches the rest of this file: safe to re-run, never
 * duplicating rows on a second `pnpm db:seed`.
 */
async function seedDemoBusinessData(studioId: string, ownerId: string, branchIds: { bangalore: string; coimbatore: string }) {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
  const rupees = (n: number) => n * 100;

  // ── Packages ──────────────────────────────────────────────────────
  const packageDefs = [
    { name: "Classic Wedding", eventType: "wedding", customerFacingTotal: rupees(150000) },
    { name: "Premium Wedding", eventType: "wedding", customerFacingTotal: rupees(280000) },
    { name: "Engagement Shoot", eventType: "engagement", customerFacingTotal: rupees(35000) },
    { name: "Birthday Essentials", eventType: "birthday", customerFacingTotal: rupees(25000) },
    { name: "Corporate Event Coverage", eventType: "corporate", customerFacingTotal: rupees(60000) },
  ];
  const packages = [];
  for (const def of packageDefs) {
    const existing = await prisma.package.findFirst({ where: { studioId, name: def.name } });
    packages.push(existing ?? (await prisma.package.create({ data: { studioId, ...def } })));
  }

  // ── Equipment ─────────────────────────────────────────────────────
  const equipmentDefs = [
    { name: "Canon EOS R5", category: "camera" },
    { name: "Sony A7 IV", category: "camera" },
    { name: "Godox AD200 Flash", category: "lighting" },
    { name: "DJI Ronin Gimbal", category: "stabilizer" },
    { name: "24-70mm f/2.8 Lens", category: "lens" },
  ];
  for (const def of equipmentDefs) {
    const existing = await prisma.equipment.findFirst({ where: { studioId, name: def.name } });
    if (!existing) await prisma.equipment.create({ data: { studioId, ...def } });
  }

  // ── Leads (a realistic funnel — new through won/lost) ───────────────
  const leadDefs = [
    { name: "Priya & Karthik", phone: "+919845010001", email: "priya.k@example.com", eventType: "wedding", source: "instagram" as const, status: "won" as const },
    { name: "Ananya Rao", phone: "+919845010002", email: "ananya.rao@example.com", eventType: "engagement", source: "referral" as const, status: "won" as const },
    { name: "Rohan Mehta", phone: "+919845010003", email: "rohan.m@example.com", eventType: "birthday", source: "website" as const, status: "won" as const },
    { name: "Tech Innovate Pvt Ltd", phone: "+919845010004", email: "events@techinnovate.example.com", eventType: "corporate", source: "referral" as const, status: "won" as const },
    { name: "Sanjana & Vivek", phone: "+919845010005", email: "sanjana.v@example.com", eventType: "wedding", source: "instagram" as const, status: "negotiation" as const },
    { name: "Divya Krishnan", phone: "+919845010006", email: "divya.k@example.com", eventType: "birthday", source: "whatsapp" as const, status: "quotation_sent" as const },
    { name: "Arjun Nair", phone: "+919845010007", email: "arjun.n@example.com", eventType: "engagement", source: "walk_in" as const, status: "contacted" as const },
    { name: "Meenakshi Textiles", phone: "+919845010008", email: "marketing@meenakshitextiles.example.com", eventType: "corporate", source: "website" as const, status: "new" as const },
    { name: "Kavya & Suresh", phone: "+919845010009", email: "kavya.s@example.com", eventType: "wedding", source: "referral" as const, status: "lost" as const },
    { name: "Ibrahim Ali", phone: "+919845010010", email: "ibrahim.ali@example.com", eventType: "birthday", source: "instagram" as const, status: "qualified" as const },
  ];
  const leads = [];
  for (const def of leadDefs) {
    const existing = await prisma.lead.findFirst({ where: { studioId, phone: def.phone } });
    leads.push(existing ?? (await prisma.lead.create({ data: { studioId, branchId: branchIds.bangalore, ...def, createdAt: daysAgo(45) } })));
  }

  // ── Clients (converted from the 4 "won" leads) ──────────────────────
  const wonLeads = leads.filter((l: { status: string }) => l.status === "won");
  const clients = [];
  for (const lead of wonLeads) {
    const existing = await prisma.client.findFirst({ where: { studioId, phone: lead.phone! } });
    clients.push(existing ?? (await prisma.client.create({ data: { studioId, name: lead.name, phone: lead.phone, email: lead.email } })));
  }
  const [wedClient, engClient, bdayClient, corpClient] = clients;

  // ── Quotations ────────────────────────────────────────────────────
  const quotationDefs = [
    { client: wedClient, lead: wonLeads[0], pkg: packages[1], number: "Q-2026-0001", status: "accepted" as const },
    { client: engClient, lead: wonLeads[1], pkg: packages[2], number: "Q-2026-0002", status: "accepted" as const },
    { client: bdayClient, lead: wonLeads[2], pkg: packages[3], number: "Q-2026-0003", status: "accepted" as const },
    { client: corpClient, lead: wonLeads[3], pkg: packages[4], number: "Q-2026-0004", status: "accepted" as const },
  ];
  const quotations = [];
  for (const def of quotationDefs) {
    const existing = await prisma.quotation.findFirst({ where: { studioId, quotationNumber: def.number } });
    quotations.push(
      existing ??
        (await prisma.quotation.create({
          data: {
            studioId,
            clientId: def.client.id,
            leadId: def.lead.id,
            quotationNumber: def.number,
            status: def.status,
            subtotal: def.pkg.customerFacingTotal,
            totalAmount: def.pkg.customerFacingTotal,
            createdBy: ownerId,
          },
        })),
    );
  }

  // ── Bookings ──────────────────────────────────────────────────────
  const bookings = [];
  for (let i = 0; i < quotations.length; i++) {
    const existing = await prisma.booking.findFirst({ where: { studioId, quotationId: quotations[i]!.id } });
    bookings.push(
      existing ??
        (await prisma.booking.create({ data: { studioId, clientId: quotationDefs[i]!.client.id, quotationId: quotations[i]!.id, status: "confirmed" } })),
    );
  }

  // ── Events (2 in the past — delivered, 2 upcoming) ───────────────────
  const eventDefs = [
    { client: wedClient, booking: bookings[0], eventType: "wedding", venue: "Taj West End, Bangalore", scheduledAt: daysAgo(20), status: "completed" as const, branchId: branchIds.bangalore },
    { client: engClient, booking: bookings[1], eventType: "engagement", venue: "The Leela Palace, Bangalore", scheduledAt: daysAgo(10), status: "completed" as const, branchId: branchIds.bangalore },
    { client: bdayClient, booking: bookings[2], eventType: "birthday", venue: "Client's residence, Coimbatore", scheduledAt: daysFromNow(7), status: "confirmed" as const, branchId: branchIds.coimbatore },
    { client: corpClient, booking: bookings[3], eventType: "corporate", venue: "Tech Innovate HQ, Bangalore", scheduledAt: daysFromNow(14), status: "confirmed" as const, branchId: branchIds.bangalore },
  ];
  const events = [];
  for (const def of eventDefs) {
    const existing = await prisma.event.findFirst({ where: { studioId, bookingId: def.booking.id } });
    events.push(
      existing ??
        (await prisma.event.create({
          data: { studioId, clientId: def.client.id, bookingId: def.booking.id, branchId: def.branchId, eventType: def.eventType, venue: def.venue, scheduledAt: def.scheduledAt, status: def.status, createdBy: ownerId },
        })),
    );
  }

  // ── Invoices + Payments ───────────────────────────────────────────
  const invoiceDefs = [
    { event: events[0], client: wedClient, quotation: quotations[0], number: "INV-2026-27-0001", total: quotations[0].totalAmount, paid: quotations[0].totalAmount, status: "paid" as const },
    { event: events[1], client: engClient, quotation: quotations[1], number: "INV-2026-27-0002", total: quotations[1].totalAmount, paid: quotations[1].totalAmount, status: "paid" as const },
    { event: events[2], client: bdayClient, quotation: quotations[2], number: "INV-2026-27-0003", total: quotations[2].totalAmount, paid: Math.round(quotations[2].totalAmount / 2), status: "partially_paid" as const },
    { event: events[3], client: corpClient, quotation: quotations[3], number: "INV-2026-27-0004", total: quotations[3].totalAmount, paid: 0, status: "unpaid" as const },
  ];
  for (const def of invoiceDefs) {
    const existing = await prisma.invoice.findFirst({ where: { studioId, invoiceNumber: def.number } });
    const invoice =
      existing ??
      (await prisma.invoice.create({
        data: {
          studioId,
          clientId: def.client.id,
          eventId: def.event.id,
          quotationId: def.quotation.id,
          invoiceNumber: def.number,
          financialYear: "2026-27",
          status: def.status,
          subtotal: def.total,
          totalAmount: def.total,
          amountPaid: def.paid,
          dueDate: daysFromNow(14),
          createdBy: ownerId,
        },
      }));

    if (def.paid > 0) {
      const existingPayment = await prisma.clientPayment.findFirst({ where: { invoiceId: invoice.id } });
      if (!existingPayment) {
        await prisma.clientPayment.create({ data: { invoiceId: invoice.id, amount: def.paid, method: "upi", paidAt: def.event.scheduledAt } });
      }
    }
  }

  // ── Expenses (tied to the two completed events, for real profit numbers) ──
  const expenseDefs = [
    { event: events[0], category: "travel" as const, amount: rupees(8000), description: "Venue travel & logistics" },
    { event: events[0], category: "equipment" as const, amount: rupees(5000), description: "Additional lighting rental" },
    { event: events[1], category: "travel" as const, amount: rupees(3000), description: "Local transport" },
    { event: null, category: "marketing" as const, amount: rupees(12000), description: "Instagram ad campaign — Q1" },
    { event: null, category: "rent" as const, amount: rupees(45000), description: "Studio rent — monthly" },
  ];
  for (const def of expenseDefs) {
    const existing = await prisma.expense.findFirst({ where: { studioId, description: def.description } });
    if (!existing) {
      await prisma.expense.create({ data: { studioId, eventId: def.event?.id, category: def.category, amount: def.amount, description: def.description, createdBy: ownerId } });
    }
  }

  // ── Galleries + photos (for the two completed events) ─────────────
  const galleries = [];
  for (const event of [events[0], events[1]]) {
    const existing = await prisma.gallery.findFirst({ where: { studioId, eventId: event.id } });
    const gallery =
      existing ??
      (await prisma.gallery.create({ data: { studioId, eventId: event.id, title: `${event.eventType === "wedding" ? "Priya & Karthik's Wedding" : "Ananya's Engagement"}`, faceSearchEnabled: true } }));
    galleries.push(gallery);

    const existingPhotoCount = await prisma.galleryPhoto.count({ where: { galleryId: gallery.id } });
    if (existingPhotoCount === 0) {
      const photoRows = Array.from({ length: 8 }, (_, i) => ({
        galleryId: gallery.id,
        studioId,
        fileKey: `demo/${gallery.id}/original-${i + 1}.jpg`,
        compressedKey: `demo/${gallery.id}/compressed-${i + 1}.jpg`,
        thumbnailKey: `demo/${gallery.id}/thumb-${i + 1}.jpg`,
        width: 4000,
        height: 6000,
        order: i,
      }));
      await prisma.galleryPhoto.createMany({ data: photoRows });
    }
  }

  // ── AI results — photo analysis on a few photos from the wedding gallery ──
  const weddingPhotos = await prisma.galleryPhoto.findMany({ where: { galleryId: galleries[0].id }, take: 4 });
  for (let i = 0; i < weddingPhotos.length; i++) {
    const photo = weddingPhotos[i];
    const existing = await prisma.photoAnalysis.findUnique({ where: { galleryPhotoId: photo.id } });
    if (!existing) {
      const isBest = i === 0;
      await prisma.photoAnalysis.create({
        data: {
          studioId,
          galleryPhotoId: photo.id,
          blurScore: isBest ? 92 : 68,
          isBlurry: !isBest && i === 3,
          sharpnessScore: isBest ? 90 : 55,
          noiseScore: 12,
          exposureScore: 85,
          exposureAssessment: "good",
          faceCount: 2,
          closedEyeDetected: false,
          smileDetected: true,
          isGroupPhoto: false,
          subjectProminenceScore: isBest ? 88 : 60,
          sceneClassification: "outdoor_ceremony",
          momentTags: isBest ? ["ring_exchange", "first_kiss"] : [],
          compositionScore: isBest ? 91 : 58,
          qualityScore: isBest ? 90 : 55,
          confidence: 94,
          explanation: isBest ? "Sharp focus on both subjects, well-composed, genuine emotion captured at the key moment." : "Acceptable quality but softer focus and less compelling composition than the gallery's top shots.",
        },
      });
    }
  }

  // ── Album + selection (demonstrating "Album selections") ─────────
  const existingAlbum = await prisma.album.findFirst({ where: { studioId, eventId: events[0].id } });
  const album =
    existingAlbum ??
    (await prisma.album.create({ data: { studioId, eventId: events[0].id, sourceGalleryId: galleries[0].id, status: "selection_in_progress", deadline: daysFromNow(10) } }));

  const albumPhotos = await prisma.galleryPhoto.findMany({ where: { galleryId: galleries[0].id }, take: 5 });
  for (let i = 0; i < albumPhotos.length; i++) {
    const existing = await prisma.albumSelectionItem.findFirst({ where: { albumId: album.id, galleryPhotoId: albumPhotos[i].id } });
    if (!existing) {
      await prisma.albumSelectionItem.create({ data: { albumId: album.id, galleryPhotoId: albumPhotos[i].id, status: i < 3 ? "selected" : "pending", isFavorite: i === 0 } });
    }
  }

  // ── Automation example ────────────────────────────────────────────
  const existingRule = await prisma.automationRule.findFirst({ where: { studioId, name: "Payment overdue reminder" } });
  if (!existingRule) {
    const rule = await prisma.automationRule.create({
      data: { studioId, name: "Payment overdue reminder", description: "Sends a WhatsApp reminder automatically when an invoice passes its due date.", triggerType: "payment_overdue", isActive: true, createdBy: ownerId },
    });
    await prisma.automationStep.create({
      data: { ruleId: rule.id, actionType: "send_whatsapp", actionConfig: { body: "Hi! Just a friendly reminder that your invoice is now overdue. Let us know if you have any questions." }, isEntryPoint: true },
    });
  }

  // ── AI Marketing Studio example ("AI results") ───────────────────
  const existingContent = await prisma.marketingContentRequest.findFirst({ where: { studioId, contentType: "instagram_caption" } });
  if (!existingContent) {
    await prisma.marketingContentRequest.create({
      data: {
        studioId,
        contentType: "instagram_caption",
        language: "english",
        inputs: { service: "Wedding photography", city: "Bengaluru", tone: "warm" },
        generatedContent: "Golden hour, golden memories ✨ Priya & Karthik's wedding day was pure magic from the first look to the last dance. Swipe to relive it with us. 💛 #BalloonConnectWeddings #BengaluruWeddingPhotographer",
        isApproved: true,
        createdBy: ownerId,
      },
    });
  }

  return { packages, leads, clients, quotations, bookings, events, galleries };
}

async function main() {
  const { superAdmin } = await seedPlatformCatalog();
  const plans = await seedSubscriptionPlans();
  await seedFeatureFlagDefaults();

  const studioPlan = plans.find((p: { key: string }) => p.key === "professional")!;
  const { studio, owner, branches } = await seedDemoStudio(superAdmin.id, studioPlan.id);

  console.log("Seed complete:");
  console.log(`  Platform user  : ${superAdmin.email} (Super Admin)`);
  console.log(`  Studio         : ${studio.name} (${studio.slug})`);
  console.log(`  Branches       : ${branches.map((b: { name: string }) => b.name).join(", ")}`);
  console.log(`  Studio owner   : ${owner.email}`);
  console.log(`  Studio roles   : ${Object.keys(STUDIO_ROLE_DEFINITIONS).join(", ")}`);
  console.log(`  Plans seeded   : ${plans.map((p: { key: string }) => p.key).join(", ")}`);

  if (shouldSeedDemoBusinessData()) {
    const [bangalore, coimbatore] = branches;
    const demo = await seedDemoBusinessData(studio.id, owner.id, { bangalore: bangalore.id, coimbatore: coimbatore.id });
    console.log("Demo business data seeded:");
    console.log(`  Leads          : ${demo.leads.length}`);
    console.log(`  Clients        : ${demo.clients.length}`);
    console.log(`  Quotations     : ${demo.quotations.length}`);
    console.log(`  Bookings       : ${demo.bookings.length}`);
    console.log(`  Events         : ${demo.events.length}`);
    console.log(`  Galleries      : ${demo.galleries.length}`);
  } else {
    console.log("Demo business data: skipped (production environment, SEED_DEMO_DATA not set to \"true\")");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
