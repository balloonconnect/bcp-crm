import type { Meta, StoryObj } from "@storybook/react";
import { TabletNavigation } from "../components/layout/tablet-navigation";
import { mockPrimaryNavItems, mockSecondaryNavItems, mockStudios, mockBranches, mockUser } from "./mock-data";

const meta: Meta<typeof TabletNavigation> = {
  title: "Layout/TabletNavigation",
  component: TabletNavigation,
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "tabletLandscape" } },
};
export default meta;

type Story = StoryObj<typeof TabletNavigation>;

export const Default: Story = {
  render: () => (
    <div className="flex h-dvh">
      <TabletNavigation
        primaryNavItems={mockPrimaryNavItems}
        secondaryNavItems={mockSecondaryNavItems}
        studios={mockStudios}
        activeStudioId={mockStudios[0]!.id}
        branches={mockBranches}
        activeBranchId={mockBranches[0]!.id}
        user={mockUser}
        notifications={{ unreadCount: 2, onOpen: () => {} }}
        onOpenSearch={() => {}}
      />
      <div className="flex-1 p-8 text-sm text-muted-foreground">
        Adaptive content area — fills the remaining width next to the compact rail.
      </div>
    </div>
  ),
};
