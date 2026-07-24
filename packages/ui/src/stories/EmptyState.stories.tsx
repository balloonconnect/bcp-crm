import type { Meta, StoryObj } from "@storybook/react";
import { UserPlus } from "lucide-react";
import { EmptyState } from "../components/states/empty-state";
import { Button } from "../components/button";

const meta: Meta<typeof EmptyState> = {
  title: "States/EmptyState",
  component: EmptyState,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    title: "No leads yet",
    description: "New enquiries from your website, Instagram, and WhatsApp will show up here.",
  },
  render: (args) => (
    <EmptyState
      {...args}
      icon={UserPlus}
      action={<Button variant="brand">Add your first lead</Button>}
    />
  ),
};
