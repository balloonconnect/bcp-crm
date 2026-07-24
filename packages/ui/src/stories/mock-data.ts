import { Home, Users, CalendarDays, Wallet, Image, Settings, FileText, UserPlus, CalendarPlus, Receipt } from "lucide-react";
import type { NavItem, StudioOption, BranchOption, CurrentUser, QuickCreateItem } from "../components/layout/nav-types";
import type { DataColumn } from "../components/data/data-view-types";

export const mockPrimaryNavItems: NavItem[] = [
  { id: "home", label: "Home", href: "#", icon: Home, isActive: true },
  { id: "leads", label: "Leads", href: "#", icon: Users, badge: 12 },
  { id: "events", label: "Events", href: "#", icon: CalendarDays },
  { id: "payments", label: "Payments", href: "#", icon: Wallet },
  { id: "galleries", label: "Galleries", href: "#", icon: Image },
];

export const mockSecondaryNavItems: NavItem[] = [
  { id: "invoices", label: "Invoices", href: "#", icon: FileText },
  { id: "settings", label: "Settings", href: "#", icon: Settings },
];

export const mockStudios: StudioOption[] = [
  { id: "studio-1", name: "Balloon Connect Photography" },
  { id: "studio-2", name: "Frame & Co Studios" },
];

export const mockBranches: BranchOption[] = [
  { id: "branch-1", name: "Bangalore — Indiranagar", studioId: "studio-1" },
  { id: "branch-2", name: "Coimbatore — RS Puram", studioId: "studio-1" },
];

export const mockUser: CurrentUser = {
  id: "user-1",
  name: "Vignesh Kumar",
  email: "vignesh@balloonconnect.studio",
  role: "Studio owner",
};

export const mockQuickCreateItems: QuickCreateItem[] = [
  { id: "lead", label: "New lead", icon: UserPlus, onSelect: () => {} },
  { id: "event", label: "New event", icon: CalendarPlus, onSelect: () => {} },
  { id: "invoice", label: "New invoice", icon: Receipt, onSelect: () => {} },
];

export interface MockLead {
  id: string;
  name: string;
  phone: string;
  shootType: string;
  status: "new" | "contacted" | "booked" | "lost";
  value: string;
  createdAt: string;
}

export const mockLeads: MockLead[] = [
  { id: "1", name: "Ananya & Rohit", phone: "+91 98450 11223", shootType: "Wedding", status: "booked", value: "₹85,000", createdAt: "2 Jul 2026" },
  { id: "2", name: "Priya Sharma", phone: "+91 90080 33445", shootType: "Maternity", status: "new", value: "₹18,000", createdAt: "5 Jul 2026" },
  { id: "3", name: "The Iyer Family", phone: "+91 99720 55667", shootType: "Housewarming", status: "contacted", value: "₹22,000", createdAt: "7 Jul 2026" },
  { id: "4", name: "Kavya Reddy", phone: "+91 88970 88990", shootType: "Baby shoot", status: "lost", value: "₹15,000", createdAt: "1 Jul 2026" },
];

const statusLabel: Record<MockLead["status"], string> = {
  new: "New",
  contacted: "Contacted",
  booked: "Booked",
  lost: "Lost",
};

export const mockLeadColumns: DataColumn<MockLead>[] = [
  { id: "name", header: "Client", isPrimary: true, cell: (row) => row.name },
  { id: "shootType", header: "Shoot type", cell: (row) => row.shootType },
  { id: "phone", header: "Phone", cell: (row) => row.phone, hideBelow: "lg" },
  { id: "status", header: "Status", cell: (row) => statusLabel[row.status] },
  { id: "value", header: "Value", cell: (row) => row.value, align: "end" },
  { id: "createdAt", header: "Created", cell: (row) => row.createdAt, hideBelow: "xl", align: "end" },
];
