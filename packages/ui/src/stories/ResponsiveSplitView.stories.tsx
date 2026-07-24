import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ResponsiveSplitView } from "../components/layout/responsive-split-view";
import { mockLeads } from "./mock-data";

const meta: Meta<typeof ResponsiveSplitView> = {
  title: "Layout/ResponsiveSplitView",
  component: ResponsiveSplitView,
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "desktop" } },
};
export default meta;

type Story = StoryObj<typeof ResponsiveSplitView>;

function Demo() {
  const [selectedId, setSelectedId] = useState<string | null>(mockLeads[0]?.id ?? null);
  const selected = mockLeads.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="h-dvh">
      <ResponsiveSplitView
        primaryLabel="Leads"
        detailLabel="Lead detail"
        primary={
          <ul>
            {mockLeads.map((lead) => (
              <li key={lead.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(lead.id)}
                  className="flex min-h-touch-target w-full flex-col items-start border-b px-4 py-2 text-left hover:bg-accent"
                >
                  <span className="text-sm font-medium">{lead.name}</span>
                  <span className="text-xs text-muted-foreground">{lead.shootType}</span>
                </button>
              </li>
            ))}
          </ul>
        }
        detail={
          selected && (
            <div className="p-6">
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{selected.shootType} · {selected.value}</p>
            </div>
          )
        }
        detailPlaceholder="Select a lead to see details"
        onBack={() => setSelectedId(null)}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const MobileViewport: Story = {
  render: () => <Demo />,
  parameters: { viewport: { defaultViewport: "standardMobile" } },
};
