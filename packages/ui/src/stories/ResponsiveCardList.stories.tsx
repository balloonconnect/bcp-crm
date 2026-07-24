import type { Meta, StoryObj } from "@storybook/react";
import { ResponsiveCardList } from "../components/data/responsive-card-list";
import { Button } from "../components/button";
import { mockLeads, mockLeadColumns } from "./mock-data";

const meta: Meta<typeof ResponsiveCardList> = {
  title: "Data/ResponsiveCardList",
  component: ResponsiveCardList,
  parameters: { layout: "padded", viewport: { defaultViewport: "standardMobile" } },
};
export default meta;

type Story = StoryObj<typeof ResponsiveCardList<(typeof mockLeads)[number]>>;

export const Default: Story = {
  render: () => (
    <ResponsiveCardList
      columns={mockLeadColumns}
      rows={mockLeads}
      getRowId={(row) => row.id}
      onRowClick={() => {}}
      renderRowActions={() => <Button size="sm" variant="outline">View</Button>}
    />
  ),
};
