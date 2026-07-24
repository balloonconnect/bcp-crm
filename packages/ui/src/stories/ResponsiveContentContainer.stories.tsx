import type { Meta, StoryObj } from "@storybook/react";
import { ResponsiveContentContainer } from "../components/layout/responsive-content-container";

const meta: Meta<typeof ResponsiveContentContainer> = {
  title: "Layout/ResponsiveContentContainer",
  component: ResponsiveContentContainer,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof ResponsiveContentContainer>;

export const Default: Story = {
  render: (args) => (
    <ResponsiveContentContainer {...args}>
      <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        Padding scales from tight (small mobile) to generous (large desktop);
        content caps at 1200px by default so text never stretches edge to edge
        on very wide screens.
      </div>
    </ResponsiveContentContainer>
  ),
};

export const Narrow: Story = {
  args: { maxWidth: "narrow" },
  render: Default.render,
};
