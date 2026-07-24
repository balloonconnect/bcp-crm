import type { Meta, StoryObj } from "@storybook/react";
import { StickyActionBar } from "../components/layout/sticky-action-bar";
import { Button } from "../components/button";

const meta: Meta<typeof StickyActionBar> = {
  title: "Layout/StickyActionBar",
  component: StickyActionBar,
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "standardMobile" } },
};
export default meta;

type Story = StoryObj<typeof StickyActionBar>;

export const Default: Story = {
  render: () => (
    <div className="flex h-[600px] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-sm text-muted-foreground">Scroll this area — the action bar stays pinned above the (simulated) mobile bottom nav.</p>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-md border p-4 text-sm">Form field {i + 1}</div>
        ))}
      </div>
      <StickyActionBar>
        <Button variant="outline">Cancel</Button>
        <Button variant="brand">Save lead</Button>
      </StickyActionBar>
    </div>
  ),
};
