import type { Meta, StoryObj } from "@storybook/react";
import { ResponsiveFormLayout, FormField } from "../components/data/responsive-form-layout";
import { Input } from "../components/primitives/input";

const meta: Meta<typeof ResponsiveFormLayout> = {
  title: "Data/ResponsiveFormLayout",
  component: ResponsiveFormLayout,
};
export default meta;

type Story = StoryObj<typeof ResponsiveFormLayout>;

export const LeadForm: Story = {
  render: () => (
    <ResponsiveFormLayout
      sections={[
        {
          id: "client",
          title: "Client details",
          description: "Who is this shoot for?",
          columns: 2,
          children: (
            <>
              <FormField label="Full name" htmlFor="name" required>
                <Input placeholder="Ananya Rao" />
              </FormField>
              <FormField label="Phone" htmlFor="phone" required hint="Include country code">
                <Input placeholder="+91 98450 11223" />
              </FormField>
              <FormField label="Notes" htmlFor="notes" fullWidth>
                <Input placeholder="Outdoor maternity shoot, prefers early morning" />
              </FormField>
            </>
          ),
        },
        {
          id: "shoot",
          title: "Shoot details",
          columns: 3,
          children: (
            <>
              <FormField label="Shoot type" htmlFor="type"><Input placeholder="Maternity" /></FormField>
              <FormField label="Date" htmlFor="date" error="Pick a date"><Input type="date" /></FormField>
              <FormField label="Budget" htmlFor="budget"><Input placeholder="₹18,000" /></FormField>
            </>
          ),
        },
      ]}
    />
  ),
};
