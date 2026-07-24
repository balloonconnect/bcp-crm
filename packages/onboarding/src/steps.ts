export type OnboardingStepKey =
  | "owner_account"
  | "studio_name"
  | "business_info"
  | "branch"
  | "logo"
  | "brand_colors"
  | "gst_details"
  | "bank_details"
  | "upi_qr"
  | "email_setup"
  | "whatsapp_setup"
  | "team_invitation"
  | "services"
  | "packages"
  | "customer_import"
  | "storage"
  | "payment_gateway"
  | "custom_domain"
  | "subscription"
  | "final_review";

export type OnboardingStepCategory =
  | "account"
  | "branding"
  | "billing"
  | "communications"
  | "team"
  | "catalog"
  | "infrastructure"
  | "review";

export interface OnboardingStepDefinition {
  key: OnboardingStepKey;
  order: number;
  title: string;
  description: string;
  category: OnboardingStepCategory;
  /** Required steps can't be skipped — everything else can (see "Skip optional steps"). */
  required: boolean;
  /**
   * Whether completing this step provisions/updates real platform
   * records immediately (true) vs. only stages data in
   * `OnboardingSession.stepData` until the studio itself is provisioned
   * (false — only the first two steps, which run *before* a Studio row
   * exists). See packages/onboarding/docs/onboarding.md § "Staged vs.
   * live steps".
   */
  writesLiveRecord: boolean;
}

/**
 * The single source of truth for step order, titles, and behavior — the
 * wizard UI, the backend's step validators, and the setup checklist all
 * read from this list rather than each hardcoding their own copy.
 */
export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  { key: "owner_account", order: 1, title: "Owner account", description: "Create the account that will own this studio.", category: "account", required: true, writesLiveRecord: false },
  { key: "studio_name", order: 2, title: "Studio name", description: "What should we call your studio?", category: "account", required: true, writesLiveRecord: false },
  { key: "business_info", order: 3, title: "Business information", description: "Legal name, address, and business type.", category: "account", required: false, writesLiveRecord: true },
  { key: "branch", order: 4, title: "Branch", description: "Set up your first branch or location.", category: "account", required: true, writesLiveRecord: true },
  { key: "logo", order: 5, title: "Logo", description: "Upload your studio's logo.", category: "branding", required: false, writesLiveRecord: true },
  { key: "brand_colors", order: 6, title: "Brand colours", description: "Choose your primary and accent colours.", category: "branding", required: false, writesLiveRecord: true },
  { key: "gst_details", order: 7, title: "GST details", description: "Add your GSTIN for invoicing (optional if unregistered).", category: "billing", required: false, writesLiveRecord: true },
  { key: "bank_details", order: 8, title: "Bank details", description: "For payouts and invoice bank details.", category: "billing", required: false, writesLiveRecord: true },
  { key: "upi_qr", order: 9, title: "UPI QR", description: "Add a UPI ID to generate a payment QR code for invoices.", category: "billing", required: false, writesLiveRecord: true },
  { key: "email_setup", order: 10, title: "Email setup", description: "The name and address your studio's emails send from.", category: "communications", required: false, writesLiveRecord: true },
  { key: "whatsapp_setup", order: 11, title: "WhatsApp setup", description: "Connect the WhatsApp number clients will hear from.", category: "communications", required: false, writesLiveRecord: true },
  { key: "team_invitation", order: 12, title: "Team invitation", description: "Invite teammates to join your studio.", category: "team", required: false, writesLiveRecord: true },
  { key: "services", order: 13, title: "Services", description: "The shoot types your studio offers.", category: "catalog", required: false, writesLiveRecord: true },
  { key: "packages", order: 14, title: "Packages", description: "Bundle services into packages you can quote from.", category: "catalog", required: false, writesLiveRecord: true },
  { key: "customer_import", order: 15, title: "Customer import", description: "Bring in your existing client list.", category: "catalog", required: false, writesLiveRecord: true },
  { key: "storage", order: 16, title: "Storage", description: "Review your plan's storage allowance.", category: "infrastructure", required: false, writesLiveRecord: false },
  { key: "payment_gateway", order: 17, title: "Payment gateway", description: "Connect Razorpay or Stripe to collect payments online.", category: "infrastructure", required: false, writesLiveRecord: true },
  { key: "custom_domain", order: 18, title: "Custom domain", description: "Point your own domain at your studio (optional).", category: "infrastructure", required: false, writesLiveRecord: true },
  { key: "subscription", order: 19, title: "Subscription", description: "Confirm your plan — you start on a trial by default.", category: "billing", required: true, writesLiveRecord: true },
  { key: "final_review", order: 20, title: "Final review", description: "Review everything before you finish setup.", category: "review", required: true, writesLiveRecord: false },
];

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

export function getStepDefinition(key: OnboardingStepKey): OnboardingStepDefinition {
  const step = ONBOARDING_STEPS.find((s) => s.key === key);
  if (!step) throw new Error(`Unknown onboarding step: "${key}"`);
  return step;
}

export function getStepByOrder(order: number): OnboardingStepDefinition | undefined {
  return ONBOARDING_STEPS.find((s) => s.order === order);
}

export const REQUIRED_STEP_KEYS: OnboardingStepKey[] = ONBOARDING_STEPS.filter((s) => s.required).map((s) => s.key);
export const OPTIONAL_STEP_KEYS: OnboardingStepKey[] = ONBOARDING_STEPS.filter((s) => !s.required).map((s) => s.key);
