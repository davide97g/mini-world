import type { Meta, StoryObj } from "@storybook/react";
import { typography } from "../tokens/typography";

const meta = {
  title: "Design System/Tokens/Typography",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const FontSizes: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Font Sizes</h2>
        <div className="space-y-4">
          {Object.entries(typography.fontSize).map(([key, value]) => {
            // fontSize values are always tuples: [string, { lineHeight, letterSpacing }]
            const size = value[0] as string;
            const lineHeight = value[1]?.lineHeight as string | undefined;
            return (
              <div key={key} className="border-b pb-4">
                <div className="text-sm text-gray-500 mb-2">
                  text-{key} | {size} | line-height: {lineHeight || "default"}
                </div>
                <div
                  className="font-sans"
                  style={{
                    fontSize: size,
                    lineHeight: lineHeight,
                  }}
                >
                  The quick brown fox jumps over the lazy dog
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  ),
};

export const FontWeights: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Font Weights</h2>
        <div className="space-y-4">
          {Object.entries(typography.fontWeight).map(([key, value]) => (
            <div key={key} className="border-b pb-4">
              <div className="text-sm text-gray-500 mb-2">
                font-{key} | {value}
              </div>
              <div className="text-xl" style={{ fontWeight: value }}>
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

export const FontFamilies: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Font Families</h2>
        <div className="space-y-4">
          <div className="border-b pb-4">
            <div className="text-sm text-gray-500 mb-2">font-sans</div>
            <div className="text-xl font-sans">
              The quick brown fox jumps over the lazy dog
            </div>
          </div>
          <div className="border-b pb-4">
            <div className="text-sm text-gray-500 mb-2">font-mono</div>
            <div className="text-xl font-mono">
              The quick brown fox jumps over the lazy dog
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};
