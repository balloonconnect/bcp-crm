import type { Meta, StoryObj } from "@storybook/react";
import { MobileBottomSheet } from "../components/overlay/mobile-bottom-sheet";
import { Button } from "../components/button";

const meta: Meta<typeof MobileBottomSheet> = {
  title: "Overlay/MobileBottomSheet",
  component: MobileBottomSheet,
  parameters: { viewport: { defaultViewport: "standardMobile" } },
};
export default meta;

type Story = StoryObj<typeof MobileBottomSheet>;

export const StatusPicker: Story = {
  render: () => (
    <MobileBottomSheet trigger={<Button variant="outline">Change status</Button>} title="Set lead status">
      <div className="flex flex-col gap-1">
        {["New", "Contacted", "Booked", "Lost"].map((status) => (
          <button
            key={status}
            type="button"
            className="flex min-h-touch-target items-center rounded-md px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {status}
          </button>
        ))}
      </div>
    </MobileBottomSheet>
  ),
};
