import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ResponsiveFilterBar, type ActiveFilter } from "../components/data/responsive-filter-bar";

const meta: Meta<typeof ResponsiveFilterBar> = {
  title: "Data/ResponsiveFilterBar",
  component: ResponsiveFilterBar,
};
export default meta;

type Story = StoryObj<typeof ResponsiveFilterBar>;

function Demo() {
  const [filters, setFilters] = useState<ActiveFilter[]>([
    { id: "status", label: "Status: Booked", onRemove: () => setFilters((f) => f.filter((x) => x.id !== "status")) },
  ]);

  return (
    <ResponsiveFilterBar
      quickFilters={
        <>
          {["All", "New", "Contacted", "Booked", "Lost"].map((label) => (
            <button
              key={label}
              type="button"
              className="flex min-h-touch-target shrink-0 items-center rounded-full border px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {label}
            </button>
          ))}
        </>
      }
      activeFilters={filters}
      advancedFilters={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select className="min-h-touch-target rounded-md border px-3 text-sm">
            <option>Shoot type</option>
          </select>
          <select className="min-h-touch-target rounded-md border px-3 text-sm">
            <option>Branch</option>
          </select>
        </div>
      }
    />
  );
}

export const Default: Story = { render: () => <Demo /> };
export const MobileViewport: Story = {
  render: () => <Demo />,
  parameters: { viewport: { defaultViewport: "standardMobile" } },
};
