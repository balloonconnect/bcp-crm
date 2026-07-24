import type { Meta, StoryObj } from "@storybook/react";
import { ResponsiveDataView } from "../components/data/responsive-data-view";
import { Button } from "../components/button";
import { mockLeads, mockLeadColumns } from "./mock-data";

const meta: Meta<typeof ResponsiveDataView> = {
  title: "Data/ResponsiveDataView",
  component: ResponsiveDataView,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof ResponsiveDataView<(typeof mockLeads)[number]>>;

export const Default: Story = {
  render: () => (
    <ResponsiveDataView
      columns={mockLeadColumns}
      rows={mockLeads}
      getRowId={(row) => row.id}
      onRowClick={() => {}}
      renderRowActions={() => <Button size="sm" variant="outline">View</Button>}
    />
  ),
};

export const ForcedCards: Story = {
  render: () => (
    <ResponsiveDataView
      columns={mockLeadColumns}
      rows={mockLeads}
      getRowId={(row) => row.id}
      forceLayout="cards"
    />
  ),
};

export const ForcedTable: Story = {
  render: () => (
    <ResponsiveDataView
      columns={mockLeadColumns}
      rows={mockLeads}
      getRowId={(row) => row.id}
      forceLayout="table"
    />
  ),
};

export const Loading: Story = {
  render: () => (
    <ResponsiveDataView columns={mockLeadColumns} rows={[]} getRowId={(row) => row.id} isLoading loadingLabel="Loading leads…" />
  ),
};

export const Empty: Story = {
  render: () => <ResponsiveDataView columns={mockLeadColumns} rows={[]} getRowId={(row) => row.id} />,
};
