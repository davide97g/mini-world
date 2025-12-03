import type { Meta, StoryObj } from "@storybook/react";
import { colors } from "../tokens/colors";

const meta = {
  title: "Design System/Tokens/Colors",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const EVColors: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4 text-foreground">
          EV Energy Colors
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div
              className="w-24 h-24 rounded-lg border"
              style={{ backgroundColor: colors.ev.teal }}
            />
            <div className="text-sm text-foreground">
              <div className="font-semibold">ev.teal</div>
              <div className="text-muted-foreground">{colors.ev.teal}</div>
            </div>
          </div>
          <div className="space-y-2">
            <div
              className="w-full h-24 rounded-lg border"
              style={{ backgroundColor: colors.ev.purple }}
            />
            <div className="text-sm text-foreground">
              <div className="font-semibold">ev.purple</div>
              <div className="text-muted-foreground">{colors.ev.purple}</div>
            </div>
          </div>
          <div className="space-y-2">
            <div
              className="w-full h-24 rounded-lg border"
              style={{ backgroundColor: colors.ev.tealDark }}
            />
            <div className="text-sm text-foreground">
              <div className="font-semibold">ev.tealDark</div>
              <div className="text-muted-foreground">{colors.ev.tealDark}</div>
            </div>
          </div>
          <div className="space-y-2">
            <div
              className="w-full h-24 rounded-lg border"
              style={{ backgroundColor: colors.ev.purpleDark }}
            />
            <div className="text-sm text-foreground">
              <div className="font-semibold">ev.purpleDark</div>
              <div
                className="text-muted-foreground"
                style={{ color: colors.ev.purpleDark }}
              >
                {colors.ev.purpleDark}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const EEColors: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4 text-foreground">
          EE Energy Colors
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div
              className="w-full h-24 rounded-lg border"
              style={{ backgroundColor: colors.ee.white }}
            />
            <div className="text-sm text-foreground">
              <div className="font-semibold">ee.white</div>
              <div
                className="text-muted-foreground"
                style={{ color: colors.ee.white }}
              >
                {colors.ee.white}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div
              className="w-full h-24 rounded-lg border"
              style={{ backgroundColor: colors.ee.yellow }}
            />
            <div className="text-sm text-foreground">
              <div className="font-semibold">ee.yellow</div>
              <div className="text-muted-foreground">{colors.ee.yellow}</div>
            </div>
          </div>
          <div className="space-y-2">
            <div
              className="w-full h-24 rounded-lg border"
              style={{ backgroundColor: colors.ee.metal }}
            />
            <div className="text-sm text-foreground">
              <div className="font-semibold">ee.metal</div>
              <div className="text-muted-foreground">{colors.ee.metal}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const BackgroundColors: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4 text-foreground">
          Background Colors
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(colors.background).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <div
                className="w-full h-24 rounded-lg border"
                style={{ backgroundColor: value }}
              />
              <div className="text-sm text-foreground">
                <div className="font-semibold">background.{key}</div>
                <div className="text-muted-foreground">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

export const DangerColors: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4 text-foreground">
          Danger Colors
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div
              className="w-full h-24 rounded-lg border"
              style={{ backgroundColor: colors.danger.toxic }}
            />
            <div className="text-sm text-foreground">
              <div className="font-semibold">danger.toxic</div>
              <div className="text-muted-foreground">{colors.danger.toxic}</div>
            </div>
          </div>
          <div className="space-y-2">
            <div
              className="w-full h-24 rounded-lg border"
              style={{ backgroundColor: colors.danger.rust }}
            />
            <div className="text-sm text-foreground">
              <div className="font-semibold">danger.rust</div>
              <div className="text-muted-foreground">{colors.danger.rust}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};
