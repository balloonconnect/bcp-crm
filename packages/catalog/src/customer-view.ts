export interface PackageServiceForView {
  name: string;
  quantity: number;
  internalPriceSnapshot: number; // paise, per unit
}

export interface PackageAddOnForView {
  name: string;
  price: number; // paise — always customer-facing, an add-on's price isn't "internal" the way a bundled service's is
  description?: string;
}

export interface PaymentScheduleItemForView {
  label: string;
  percentage: number;
  trigger: string;
}

export interface PackageForView {
  name: string;
  eventType: string;
  description?: string | null;
  customerFacingTotal: number;
  itemLevelPricingEnabled: boolean;
  durationLabel?: string | null;
  teamRequirement?: string | null;
  deliverables: string[];
  taxRatePercent: number;
  taxInclusive: boolean;
  discountAllowed: boolean;
  maxDiscountPercent?: number | null;
  termsText?: string | null;
  services: PackageServiceForView[];
  addOns: PackageAddOnForView[];
  paymentSchedule: PaymentScheduleItemForView[];
}

export interface CustomerFacingIncludedService {
  name: string;
  quantity: number;
  /** Present only when the package has item-level pricing enabled — see the module doc comment below for why this is never populated otherwise. */
  unitPrice?: number;
  lineTotal?: number;
}

export interface CustomerFacingPackageView {
  name: string;
  eventType: string;
  description?: string;
  total: number;
  durationLabel?: string;
  teamRequirement?: string;
  deliverables: string[];
  taxRatePercent: number;
  taxInclusive: boolean;
  discountAllowed: boolean;
  maxDiscountPercent?: number;
  termsText?: string;
  includedServices: CustomerFacingIncludedService[];
  addOns: PackageAddOnForView[];
  paymentSchedule: PaymentScheduleItemForView[];
  itemLevelPricingShown: boolean;
}

/**
 * THE enforcement point for the brief's core rule: "Internal individual
 * service prices must not appear in customer PDFs or WhatsApp messages
 * unless the studio explicitly enables item-level pricing." Every
 * customer-facing renderer (a quotation PDF, a WhatsApp summary, a
 * client-portal package page) must build its view of a package through
 * this function, never by reading `PackageService.internalPriceSnapshot`
 * directly — that's the one and only place a per-service price can leak
 * to a customer, and it only does when `package.itemLevelPricingEnabled`
 * is true. When it's false (the default for every new package), the
 * included-services list still shows *what's* included (names and
 * quantities — a customer should always see what they're getting), just
 * never *what each piece individually costs*.
 */
export function buildCustomerFacingPackageView(pkg: PackageForView): CustomerFacingPackageView {
  const includedServices: CustomerFacingIncludedService[] = pkg.services.map((service) => {
    if (!pkg.itemLevelPricingEnabled) {
      return { name: service.name, quantity: service.quantity };
    }
    return {
      name: service.name,
      quantity: service.quantity,
      unitPrice: service.internalPriceSnapshot,
      lineTotal: service.internalPriceSnapshot * service.quantity,
    };
  });

  return {
    name: pkg.name,
    eventType: pkg.eventType,
    description: pkg.description ?? undefined,
    total: pkg.customerFacingTotal,
    durationLabel: pkg.durationLabel ?? undefined,
    teamRequirement: pkg.teamRequirement ?? undefined,
    deliverables: pkg.deliverables,
    taxRatePercent: pkg.taxRatePercent,
    taxInclusive: pkg.taxInclusive,
    discountAllowed: pkg.discountAllowed,
    maxDiscountPercent: pkg.maxDiscountPercent ?? undefined,
    termsText: pkg.termsText ?? undefined,
    includedServices,
    addOns: pkg.addOns,
    paymentSchedule: pkg.paymentSchedule,
    itemLevelPricingShown: pkg.itemLevelPricingEnabled,
  };
}
