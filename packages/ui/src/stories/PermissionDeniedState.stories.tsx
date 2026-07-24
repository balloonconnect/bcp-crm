import type { Meta, StoryObj } from "@storybook/react";
import { PermissionDeniedState } from "../components/states/permission-denied-state";
import { Button } from "../components/button";

const meta: Meta<typeof PermissionDeniedState> = {
  title: "States/PermissionDeniedState",
  component: PermissionDeniedState,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof PermissionDeniedState>;

export const Default: Story = {
  render: (args) => <PermissionDeniedState {...args} action={<Button variant="outline">Back to dashboard</Button>} />,
};
