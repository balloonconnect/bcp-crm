import type { Meta, StoryObj } from "@storybook/react";
import { MobileHeader } from "../components/layout/mobile-header";
import { mockStudios, mockUser } from "./mock-data";

const meta: Meta<typeof MobileHeader> = {
  title: "Layout/MobileHeader",
  component: MobileHeader,
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "standardMobile" } },
};
export default meta;

type Story = StoryObj<typeof MobileHeader>;

export const Default: Story = {
  render: () => (
    <MobileHeader
      studios={mockStudios}
      activeStudioId={mockStudios[0]!.id}
      user={mockUser}
      notifications={{ unreadCount: 4, onOpen: () => {} }}
      onOpenMenu={() => {}}
      onOpenSearch={() => {}}
    />
  ),
};
