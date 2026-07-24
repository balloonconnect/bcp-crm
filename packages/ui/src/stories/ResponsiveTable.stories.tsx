import type { Meta, StoryObj } from "@storybook/react";
import { ResponsiveTable } from "../components/data/responsive-table";
import { Button } from "../components/button";
import { mockLeads, mockLeadColumns } from "./mock-data";

const meta: Meta<typeof ResponsiveTable> = {
  title: "Data/ResponsiveTable",
  component: ResponsiveTable,
  parameters: { layout: "padded", viewport: { defaultViewport: "desktop" } },
};
export default meta;

type Story = StoryObj<typeof ResponsiveTable<(typeof mockLeads)[number]>>;

export const Default: Story = {
  render: () => (
    <ResponsiveTable
      columns={mockLeadColumns}
      rows={mockLeads}
      getRowId={(row) => row.id}
      onRowClick={() => {}}
      renderRowActions={() => <Button size="sm" variant="outline">View</Button>}
    />
  ),
};
