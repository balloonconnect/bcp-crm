import type { Meta, StoryObj } from "@storybook/react";
import { OfflineState } from "../components/states/offline-state";

const meta: Meta<typeof OfflineState> = {
  title: "States/OfflineState",
  component: OfflineState,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof OfflineState>;

export const Banner: Story = { args: { variant: "banner" } };
export const FullPage: Story = { args: { variant: "full" }, parameters: { layout: "padded" } };
