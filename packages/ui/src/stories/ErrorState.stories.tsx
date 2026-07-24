import type { Meta, StoryObj } from "@storybook/react";
import { ErrorState } from "../components/states/error-state";

const meta: Meta<typeof ErrorState> = {
  title: "States/ErrorState",
  component: ErrorState,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof ErrorState>;

export const Default: Story = {
  args: {
    title: "Could not load leads",
    description: "That did not load. Check your connection and try again.",
  },
  render: (args) => <ErrorState {...args} onRetry={() => {}} />,
};
