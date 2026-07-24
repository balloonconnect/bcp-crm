import type { Meta, StoryObj } from "@storybook/react";
import { ResponsiveDrawer } from "../components/overlay/responsive-drawer";
import { Button } from "../components/button";

const meta: Meta<typeof ResponsiveDrawer> = {
  title: "Overlay/ResponsiveDrawer",
  component: ResponsiveDrawer,
};
export default meta;

type Story = StoryObj<typeof ResponsiveDrawer>;

export const Default: Story = {
  render: () => (
    <ResponsiveDrawer
      trigger={<Button variant="outline">Open filters</Button>}
      title="Filter leads"
      description="Side panel at tablet+, bottom sheet below 640px."
    >
      <div className="space-y-3">
        <div className="rounded-md border p-3 text-sm">Status</div>
        <div className="rounded-md border p-3 text-sm">Shoot type</div>
        <div className="rounded-md border p-3 text-sm">Date range</div>
      </div>
    </ResponsiveDrawer>
  ),
};
