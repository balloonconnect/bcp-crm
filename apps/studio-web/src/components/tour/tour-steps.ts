export interface TourStep {
  id: string;
  route: string; // the page this step's target lives on — the tour navigates here automatically when this step becomes active
  targetSelector: string; // a data-tour attribute on the real element being highlighted, not a guessed CSS class that could drift
  title: string;
  description: string;
}

/**
 * The 10 surfaces named in the brief, one step each — a deliberately
 * short tour (not a step per button) that shows a new studio owner
 * where the platform's own biggest ideas live, then gets out of the
 * way. Each `targetSelector` is a `data-tour="..."` attribute added
 * directly to the real element being pointed at, so the tour never
 * silently breaks because a CSS class name changed for an unrelated
 * styling reason.
 */
export const TOUR_STEPS: TourStep[] = [
  { id: "dashboard", route: "/", targetSelector: '[data-tour="dashboard-summary"]', title: "Your Dashboard", description: "Today's events, recent leads, and outstanding invoices — everything that needs your attention, at a glance, the moment you sign in." },
  { id: "leads", route: "/leads", targetSelector: '[data-tour="leads-list"]', title: "Leads", description: "Every enquiry lands here, whether it came from your website, Instagram, or a walk-in. Track each one from first contact through to a confirmed booking." },
  { id: "quotations", route: "/quotations", targetSelector: '[data-tour="quotations-list"]', title: "Quotations", description: "Send a professional quotation in minutes, and see the moment a client views or accepts it." },
  { id: "events", route: "/events", targetSelector: '[data-tour="events-calendar"]', title: "Events", description: "Your shoot calendar — team, equipment, and shot lists all attached to each event." },
  { id: "payments", route: "/invoices", targetSelector: '[data-tour="invoices-list"]', title: "Payments", description: "Invoices, payments, and exactly what's still outstanding — nothing falls through the cracks." },
  { id: "galleries", route: "/galleries", targetSelector: '[data-tour="galleries-list"]', title: "Galleries", description: "Deliver photos to your clients, with automatic web-optimized versions and thumbnails generated for every upload." },
  { id: "ai-face-search", route: "/galleries", targetSelector: '[data-tour="galleries-list"]', title: "AI Face Search", description: "Open any gallery's settings to turn this on — your clients can then find their own photos instantly with a selfie, never stored, always their own choice to use." },
  { id: "album-selection", route: "/albums", targetSelector: '[data-tour="albums-list"]', title: "Album Selection", description: "Once a client submits their photo selection for an album, it's locked in and ready for you to start designing." },
  { id: "reports", route: "/reports", targetSelector: '[data-tour="reports-picker"]', title: "Reports", description: "22 reports covering leads, revenue, profit, team performance, and more — pick one, filter it, and export it." },
  { id: "settings", route: "/team", targetSelector: '[data-tour="settings-nav"]', title: "Settings", description: "Your team, roles, and branches all live here — along with your studio's branding and integrations, reachable from the same navigation. Come back any time you need to adjust something." },
];
