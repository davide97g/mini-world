import type { Meta, StoryObj } from "@storybook/react";
import { spacing } from "../tokens/spacing";

const meta = {
  title: "Design System/Tokens/Spacing",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SpacingScale: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Spacing Scale</h2>
        <div className="space-y-4">
          {Object.entries(spacing).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-20 text-sm font-mono text-gray-600">{key}</div>
              <div className="w-32 text-sm text-gray-500">{value}</div>
              <div className="flex-1">
                <div
                  className="bg-primary-500 h-6 rounded"
                  style={{ width: value }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};
