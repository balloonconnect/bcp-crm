/**
 * Definitions for the optional "seed my studio with sample data" offer,
 * shown around the Services/Packages/Customer-import steps for a studio
 * that wants to explore the product before entering real data. Pure data
 * here; apps/api's onboarding.service.ts is responsible for actually
 * writing these into the studio's real tables when a person opts in.
 */

export interface SampleService {
  name: string;
  description: string;
  basePrice: number; // minor units
}

export const SAMPLE_SERVICES: SampleService[] = [
  { name: "Maternity Shoot", description: "Outdoor or studio maternity session, 2 hours.", basePrice: 800000 },
  { name: "Baby Shoot", description: "Newborn/baby portrait session.", basePrice: 600000 },
  { name: "Birthday Shoot", description: "Full-day birthday event coverage.", basePrice: 1500000 },
  { name: "Housewarming Shoot", description: "Half-day housewarming event coverage.", basePrice: 1000000 },
];

export interface SamplePackage {
  name: string;
  description: string;
  price: number; // minor units
  serviceNames: string[];
}

export const SAMPLE_PACKAGES: SamplePackage[] = [
  {
    name: "Maternity Essentials",
    description: "Maternity shoot with 20 edited photos and a printed album.",
    price: 1200000,
    serviceNames: ["Maternity Shoot"],
  },
  {
    name: "Baby's First Year",
    description: "Baby shoot + birthday shoot bundle.",
    price: 1800000,
    serviceNames: ["Baby Shoot", "Birthday Shoot"],
  },
];

export interface SampleCustomer {
  name: string;
  email: string;
  phone: string;
}

export const SAMPLE_CUSTOMERS: SampleCustomer[] = [
  { name: "Ananya & Rohit", email: "ananya.demo@example.com", phone: "+919800000001" },
  { name: "Priya Sharma", email: "priya.demo@example.com", phone: "+919800000002" },
  { name: "The Iyer Family", email: "iyer.demo@example.com", phone: "+919800000003" },
];
