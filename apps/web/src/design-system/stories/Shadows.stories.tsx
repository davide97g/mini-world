import type { Meta, StoryObj } from "@storybook/react";
import { shadows } from "../tokens/shadows";

const meta = {
  title: "Design System/Tokens/Shadows",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShadowScale: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Shadow Scale</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {Object.entries(shadows).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <div
                className="w-full h-24 bg-white rounded-lg border"
                style={{ boxShadow: value }}
              />
              <div className="text-sm">
                <div className="font-semibold">shadow-{key}</div>
                <div className="text-xs text-gray-500 font-mono mt-1">
                  {value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};
