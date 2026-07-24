import type { Meta, StoryObj } from "@storybook/react";
import { MobileBottomNavigation } from "../components/layout/mobile-bottom-navigation";

const meta: Meta<typeof MobileBottomNavigation> = {
  title: "Layout/MobileBottomNavigation",
  component: MobileBottomNavigation,
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "standardMobile" } },
};
export default meta;

type Story = StoryObj<typeof MobileBottomNavigation>;

export const Home: Story = {
  render: () => (
    <div className="relative h-40">
      <MobileBottomNavigation activeId="home" />
    </div>
  ),
};

export const LeadsWithBadge: Story = {
  render: () => (
    <div className="relative h-40">
      <MobileBottomNavigation
        activeId="leads"
        items={[
          { id: "home", label: "Home", href: "#" },
          { id: "leads", label: "Leads", href: "#", badge: 12 },
          { id: "events", label: "Events", href: "#" },
          { id: "payments", label: "Payments", href: "#" },
          { id: "more", label: "More", onSelect: () => {} },
        ]}
      />
    </div>
  ),
};
