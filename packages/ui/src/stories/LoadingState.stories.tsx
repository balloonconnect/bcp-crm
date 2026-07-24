import type { Meta, StoryObj } from "@storybook/react";
import { LoadingState } from "../components/states/loading-state";

const meta: Meta<typeof LoadingState> = {
  title: "States/LoadingState",
  component: LoadingState,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof LoadingState>;

export const FullBlock: Story = { args: { label: "Loading leads…" } };
export const Inline: Story = { args: { label: "Saving…", inline: true } };
