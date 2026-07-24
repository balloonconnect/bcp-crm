import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DesktopSidebar } from "../components/layout/desktop-sidebar";
import { mockPrimaryNavItems, mockStudios, mockBranches, mockUser } from "./mock-data";

const meta: Meta<typeof DesktopSidebar> = {
  title: "Layout/DesktopSidebar",
  component: DesktopSidebar,
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "desktop" } },
};
export default meta;

type Story = StoryObj<typeof DesktopSidebar>;

function Demo({ startCollapsed = false }: { startCollapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(startCollapsed);
  return (
    <div className="flex h-dvh">
      <DesktopSidebar
        primaryNavItems={mockPrimaryNavItems}
        studios={mockStudios}
        activeStudioId={mockStudios[0]!.id}
        branches={mockBranches}
        activeBranchId={mockBranches[0]!.id}
        user={mockUser}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      <div className="flex-1 p-8 text-sm text-muted-foreground">Main content area</div>
    </div>
  );
}

export const Expanded: Story = { render: () => <Demo /> };
export const Collapsed: Story = { render: () => <Demo startCollapsed /> };
