import { prisma } from "@bcp/database";
import { hashPassword, generateOpaqueToken } from "@bcp/auth";
import { STUDIO_ROLE_DEFINITIONS, STUDIO_PERMISSIONS } from "@bcp/permissions";
import { PLAN_DEFINITIONS } from "@bcp/billing";
import {
  ownerAccountStepSchema,
  studioNameStepSchema,
  computeProgress,
  buildSetupChecklist,
  assertCanSkipStep,
  STEP_SCHEMAS,
  SAMPLE_SERVICES,
  SAMPLE_PACKAGES,
  SAMPLE_CUSTOMERS,
  type OnboardingStepKey,
  type StepWithSchema,
} from "@bcp/onboarding";
import { issueSession, type IssuedTokens } from "./session-issuer";
import { setStudioSetting } from "./studio-settings.service";

export class OnboardingSessionNotFoundError extends Error {
  readonly code = "ONBOARDING_SESSION_NOT_FOUND";
  constructor() {
    super("Onboarding session not found");
    this.name = "OnboardingSessionNotFoundError";
  }
}

export class StudioNotProvisionedError extends Error {
  readonly code = "STUDIO_NOT_PROVISIONED";
  constructor() {
    super("Complete the owner account and studio name steps first");
    this.name = "StudioNotProvisionedError";
  }
}

export class SlugTakenError extends Error {
  readonly code = "SLUG_TAKEN";
  constructor() {
    super("That studio URL is already taken");
    this.name = "SlugTakenError";
  }
}

// ── Step 1: owner account (staged, no Studio yet) ───────────────────────

export async function startOnboarding(input: { name: string; email: string; password: string }) {
  const parsed = ownerAccountStepSchema.parse(input);
  const passwordHash = await hashPassword(parsed.password);

  const session = await prisma.onboardingSession.create({
    data: {
      ownerEmail: parsed.email,
      resumeToken: generateOpaqueToken(24),
      currentStep: 2,
      completedSteps: ["owner_account"],
      stepData: { owner_account: { name: parsed.name, email: parsed.email, passwordHash } },
    },
  });

  return session;
}

// ── Step 2: studio name — provisions the real Studio + owner + branch + trial subscription ──

export async function provisionStudio(sessionId: string, input: { name: string; slug: string }) {
  const session = await prisma.onboardingSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new OnboardingSessionNotFoundError();
  if (session.studioId) return session; // idempotent — already provisioned

  const parsed = studioNameStepSchema.parse(input);
  const existing = await prisma.studio.findUnique({ where: { slug: parsed.slug } });
  if (existing) throw new SlugTakenError();

  const ownerData = (session.stepData as Record<string, unknown>).owner_account as {
    name: string;
    email: string;
    passwordHash: string;
  };

  const starterPlan = await prisma.subscriptionPlan.upsert({
    where: { key: "starter" },
    update: {},
    create: {
      key: PLAN_DEFINITIONS.starter.key,
      name: PLAN_DEFINITIONS.starter.name,
      description: PLAN_DEFINITIONS.starter.description,
      priceMonthly: PLAN_DEFINITIONS.starter.priceMonthly,
      priceYearly: PLAN_DEFINITIONS.starter.priceYearly,
      limits: PLAN_DEFINITIONS.starter.limits as never,
    },
  });

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { studio, tokens } = await prisma.$transaction(async (tx: typeof prisma) => {
    const createdStudio = await tx.studio.create({
      data: {
        slug: parsed.slug,
        name: parsed.name,
        status: "trial",
        trialEndsAt,
        brand: { create: {} },
      },
    });

    // Seed this studio's role catalog from the canonical @bcp/permissions
    // definitions — same as pnpm db:seed does for the demo studio.
    await Promise.all(
      STUDIO_PERMISSIONS.map((p) => tx.studioPermission.upsert({ where: { key: p.key }, update: {}, create: p })),
    );

    const roleByKey = new Map<string, string>();
    for (const [key, def] of Object.entries(STUDIO_ROLE_DEFINITIONS)) {
      const role = await tx.studioRole.create({
        data: {
          studioId: createdStudio.id,
          key,
          name: def.name,
          description: def.description,
          isSystem: true,
          permissions: def.permissions,
        },
      });
      roleByKey.set(key, role.id);
    }

    const branch = await tx.studioBranch.create({
      data: { studioId: createdStudio.id, name: "Main Branch", isPrimary: true },
    });

    const owner = await tx.studioUser.create({
      data: {
        studioId: createdStudio.id,
        branchId: branch.id,
        email: ownerData.email,
        name: ownerData.name,
        passwordHash: ownerData.passwordHash,
        status: "active",
        emailVerifiedAt: null, // still needs to verify — see @bcp/auth email verification flow
      },
    });

    await tx.studioUserRole.create({
      data: { studioUserId: owner.id, studioRoleId: roleByKey.get("owner")! },
    });

    await tx.subscription.create({
      data: {
        studioId: createdStudio.id,
        planId: starterPlan.id,
        status: "trialing",
        billingCycle: "yearly",
        seats: 2,
        startsAt: now,
        endsAt: trialEndsAt,
        trialEndsAt,
        createdBy: owner.id,
      },
    });

    const issuedTokens = await issueSession({
      actorId: owner.id,
      actorType: "studio_user",
      studioId: createdStudio.id,
      ipAddress: null,
      userAgent: null,
    });

    return { studio: createdStudio, tokens: issuedTokens };
  });

  const updatedSession = await prisma.onboardingSession.update({
    where: { id: sessionId },
    data: {
      studioId: studio.id,
      currentStep: 3,
      completedSteps: { push: "studio_name" },
    },
  });

  return { session: updatedSession, studio, tokens: tokens as IssuedTokens };
}

// ── Steps 3+: generic settings-backed steps ─────────────────────────────

async function requireProvisionedSession(sessionId: string) {
  const session = await prisma.onboardingSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new OnboardingSessionNotFoundError();
  if (!session.studioId) throw new StudioNotProvisionedError();
  return session;
}

/** For steps whose data has no dedicated model yet (business info, GST, bank, UPI, services, packages, payment gateway) — validates and stores via StudioSetting, then marks the step complete in one call. */
export async function saveSettingsStep(sessionId: string, stepKey: StepWithSchema, data: unknown, actorId: string) {
  const session = await requireProvisionedSession(sessionId);
  const schema = STEP_SCHEMAS[stepKey];
  const parsed = schema.parse(data);

  await setStudioSetting(session.studioId!, stepKey, parsed, actorId);

  return markStepDone(sessionId, stepKey);
}

/** For steps completed via another feature's own endpoint (branch, logo, brand colors, email/WhatsApp setup, team invitation, customer import, custom domain, subscription) — just records completion. */
export async function markStepDone(sessionId: string, stepKey: OnboardingStepKey) {
  const session = await requireProvisionedSession(sessionId);
  if (session.completedSteps.includes(stepKey)) return session;

  const nextStep = Math.min(session.currentStep + 1, 20);
  return prisma.onboardingSession.update({
    where: { id: sessionId },
    data: { completedSteps: { push: stepKey }, currentStep: nextStep },
  });
}

export async function skipStep(sessionId: string, stepKey: OnboardingStepKey) {
  assertCanSkipStep(stepKey);
  const session = await requireProvisionedSession(sessionId);
  if (session.skippedSteps.includes(stepKey)) return session;

  const nextStep = Math.min(session.currentStep + 1, 20);
  return prisma.onboardingSession.update({
    where: { id: sessionId },
    data: { skippedSteps: { push: stepKey }, currentStep: nextStep },
  });
}

// ── Sample data ──────────────────────────────────────────────────────────

export async function seedSampleData(studioId: string, actorId: string) {
  await setStudioSetting(studioId, "services", { services: SAMPLE_SERVICES.map((s) => ({ name: s.name, description: s.description, basePrice: s.basePrice })) }, actorId);
  await setStudioSetting(studioId, "packages", { packages: SAMPLE_PACKAGES }, actorId);
  await prisma.client.createMany({
    data: SAMPLE_CUSTOMERS.map((c) => ({ studioId, name: c.name, email: c.email, phone: c.phone, source: "sample", createdBy: actorId })),
  });
}

// ── Progress, checklist, resume, completion ─────────────────────────────

export async function getSessionByResumeToken(resumeToken: string) {
  const session = await prisma.onboardingSession.findUnique({ where: { resumeToken } });
  if (!session) throw new OnboardingSessionNotFoundError();
  return withProgress(session);
}

export async function getSessionById(sessionId: string) {
  const session = await prisma.onboardingSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new OnboardingSessionNotFoundError();
  return withProgress(session);
}

function withProgress<T extends { completedSteps: string[]; skippedSteps: string[] }>(session: T) {
  const progress = computeProgress(session.completedSteps, session.skippedSteps);
  const checklist = buildSetupChecklist(session.completedSteps, session.skippedSteps);
  return { session, progress, checklist };
}

export class OnboardingIncompleteError extends Error {
  readonly code = "ONBOARDING_INCOMPLETE";
  constructor(public readonly outstandingRequiredSteps: string[]) {
    super(`Complete all required steps first: ${outstandingRequiredSteps.join(", ")}`);
    this.name = "OnboardingIncompleteError";
  }
}

export async function completeOnboarding(sessionId: string) {
  const session = await requireProvisionedSession(sessionId);
  const progress = computeProgress(session.completedSteps, session.skippedSteps);

  if (!progress.isComplete) {
    throw new OnboardingIncompleteError(progress.outstandingRequiredSteps);
  }

  return prisma.onboardingSession.update({
    where: { id: sessionId },
    data: { status: "completed", completedAt: new Date() },
  });
}
