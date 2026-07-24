import type { Meta, StoryObj } from "@storybook/react";
import { ResponsivePageHeader } from "../components/layout/responsive-page-header";
import { Button } from "../components/button";

const meta: Meta<typeof ResponsivePageHeader> = {
  title: "Layout/ResponsivePageHeader",
  component: ResponsivePageHeader,
};
export default meta;

type Story = StoryObj<typeof ResponsivePageHeader>;

export const Default: Story = {
  args: {
    title: "Leads",
    description: "Every enquiry across your studios, in one place.",
    breadcrumbs: [{ label: "Home", href: "#" }, { label: "Leads" }],
  },
  render: (args) => (
    <ResponsivePageHeader
      {...args}
      actions={
        <>
          <Button variant="outline">Export</Button>
          <Button variant="brand">New lead</Button>
        </>
      }
    />
  ),
};

export const NoBreadcrumbsOrActions: Story = {
  args: { title: "Dashboard" },
};
