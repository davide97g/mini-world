import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const meta = {
  title: "Design System/Components/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here. This is where you put the main content.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card className="w-96">
      <CardContent className="pt-6">
        <p>Simple card with just content.</p>
      </CardContent>
    </Card>
  ),
};

export const WithHeader: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Card with Header</CardTitle>
        <CardDescription>Description text</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Content area</p>
      </CardContent>
    </Card>
  ),
};

export const EVVariant: Story = {
  render: () => (
    <Card variant="ev" className="w-96">
      <CardHeader>
        <CardTitle className="text-ev-teal">EV Energy Card</CardTitle>
        <CardDescription>Organic, glowing teal/purple energy</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This card has an inner EV glow effect.</p>
      </CardContent>
    </Card>
  ),
};

export const EEVariant: Story = {
  render: () => (
    <Card variant="ee" className="w-96">
      <CardHeader>
        <CardTitle className="text-ee-white">EE Energy Card</CardTitle>
        <CardDescription>Electric, harsh white/yellow energy</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This card has an outer rim light effect.</p>
      </CardContent>
    </Card>
  ),
};
