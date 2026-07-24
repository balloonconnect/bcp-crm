import type { Meta, StoryObj } from "@storybook/react";
import { ResponsiveDialog } from "../components/overlay/responsive-dialog";
import { Button } from "../components/button";

const meta: Meta<typeof ResponsiveDialog> = {
  title: "Overlay/ResponsiveDialog",
  component: ResponsiveDialog,
};
export default meta;

type Story = StoryObj<typeof ResponsiveDialog>;

export const Confirmation: Story = {
  render: () => (
    <ResponsiveDialog
      trigger={<Button variant="destructive">Delete lead</Button>}
      title="Delete this lead?"
      description="This cannot be undone. The lead and its notes will be permanently removed."
      footer={
        <>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">Ananya & Rohit — Wedding, ₹85,000</p>
    </ResponsiveDialog>
  ),
};
