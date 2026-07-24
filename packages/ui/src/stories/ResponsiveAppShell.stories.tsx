import type { Meta, StoryObj } from "@storybook/react";
import { ResponsiveAppShell } from "../components/layout/responsive-app-shell";
import { ResponsiveContentContainer } from "../components/layout/responsive-content-container";
import { ResponsivePageHeader } from "../components/layout/responsive-page-header";
import {
  mockPrimaryNavItems,
  mockSecondaryNavItems,
  mockStudios,
  mockBranches,
  mockUser,
  mockQuickCreateItems,
} from "./mock-data";

const meta: Meta<typeof ResponsiveAppShell> = {
  title: "Layout/ResponsiveAppShell",
  component: ResponsiveAppShell,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof ResponsiveAppShell>;

export const Default: Story = {
  render: () => (
    <ResponsiveAppShell
      activeMobileNavId="home"
      primaryNavItems={mockPrimaryNavItems}
      secondaryNavItems={mockSecondaryNavItems}
      studios={mockStudios}
      activeStudioId={mockStudios[0]!.id}
      branches={mockBranches}
      activeBranchId={mockBranches[0]!.id}
      user={mockUser}
      notifications={{ unreadCount: 3, onOpen: () => {} }}
      quickCreateItems={mockQuickCreateItems}
      onSignOut={() => {}}
    >
      <ResponsiveContentContainer>
        <ResponsivePageHeader
          title="Leads"
          description="Every enquiry across your studios, in one place."
          breadcrumbs={[{ label: "Home", href: "#" }, { label: "Leads" }]}
        />
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Page content goes here. Resize the viewport (or use the toolbar) to see the
          shell switch between DesktopSidebar, TabletNavigation, and the mobile
          header + bottom nav.
        </div>
      </ResponsiveContentContainer>
    </ResponsiveAppShell>
  ),
};

export const MobileViewport: Story = {
  ...Default,
  parameters: { viewport: { defaultViewport: "standardMobile" } },
};

export const TabletViewport: Story = {
  ...Default,
  parameters: { viewport: { defaultViewport: "tabletLandscape" } },
};
