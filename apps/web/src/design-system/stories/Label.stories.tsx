import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const meta = {
  title: "Design System/Components/Label",
  component: Label,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="space-y-2 w-80">
      <Label htmlFor="input">Label</Label>
      <Input id="input" placeholder="Input field" />
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="space-y-2 w-80">
      <Label htmlFor="required">
        Required Field <span className="text-error-500">*</span>
      </Label>
      <Input id="required" placeholder="Required input" />
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="space-y-2 w-80">
      <Label htmlFor="description">Field Label</Label>
      <Input id="description" placeholder="Input field" />
      <p className="text-sm text-gray-500">
        This is a description or helper text for the field.
      </p>
    </div>
  ),
};
