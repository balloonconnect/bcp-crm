"use client";

import * as React from "react";
import type { OnboardingStepKey } from "@bcp/onboarding";
import { useOnboarding } from "../../lib/onboarding-context";
import { OwnerAccountStep } from "./steps/owner-account-step";
import { StudioNameStep } from "./steps/studio-name-step";
import { BusinessInfoStep } from "./steps/business-info-step";
import { BranchStep } from "./steps/branch-step";
import { LogoStep } from "./steps/logo-step";
import { BrandColorsStep } from "./steps/brand-colors-step";
import { GstDetailsStep } from "./steps/gst-details-step";
import { BankDetailsStep } from "./steps/bank-details-step";
import { UpiQrStep } from "./steps/upi-qr-step";
import { EmailSetupStep } from "./steps/email-setup-step";
import { WhatsappSetupStep } from "./steps/whatsapp-setup-step";
import { TeamInvitationStep } from "./steps/team-invitation-step";
import { ServicesStep } from "./steps/services-step";
import { PackagesStep } from "./steps/packages-step";
import { CustomerImportStep } from "./steps/customer-import-step";
import { StorageStep } from "./steps/storage-step";
import { PaymentGatewayStep } from "./steps/payment-gateway-step";
import { CustomDomainStep } from "./steps/custom-domain-step";
import { SubscriptionStep } from "./steps/subscription-step";
import { FinalReviewStep } from "./steps/final-review-step";

const STEP_COMPONENTS: Record<OnboardingStepKey, React.ComponentType> = {
  owner_account: OwnerAccountStep,
  studio_name: StudioNameStep,
  business_info: BusinessInfoStep,
  branch: BranchStep,
  logo: LogoStep,
  brand_colors: BrandColorsStep,
  gst_details: GstDetailsStep,
  bank_details: BankDetailsStep,
  upi_qr: UpiQrStep,
  email_setup: EmailSetupStep,
  whatsapp_setup: WhatsappSetupStep,
  team_invitation: TeamInvitationStep,
  services: ServicesStep,
  packages: PackagesStep,
  customer_import: CustomerImportStep,
  storage: StorageStep,
  payment_gateway: PaymentGatewayStep,
  custom_domain: CustomDomainStep,
  subscription: SubscriptionStep,
  final_review: FinalReviewStep,
};

/**
 * Renders whichever step is active. The only navigation guard is
 * pre-provisioning: a studio doesn't exist until `studio_name` is
 * completed, so nothing past that point can render yet — attempting to
 * jump ahead just bounces back to `studio_name` rather than erroring.
 */
export function StepRouter() {
  const { session, activeStepKey, setActiveStepKey } = useOnboarding();

  const studioNotYetProvisioned = !session?.studioId;
  const isPreProvisioningStep = activeStepKey === "owner_account" || activeStepKey === "studio_name";

  React.useEffect(() => {
    if (studioNotYetProvisioned && !isPreProvisioningStep) {
      setActiveStepKey(session ? "studio_name" : "owner_account");
    }
  }, [studioNotYetProvisioned, isPreProvisioningStep, session, setActiveStepKey]);

  const effectiveStepKey: OnboardingStepKey = studioNotYetProvisioned && !isPreProvisioningStep ? (session ? "studio_name" : "owner_account") : activeStepKey;

  const StepComponent = STEP_COMPONENTS[effectiveStepKey];
  return <StepComponent />;
}
