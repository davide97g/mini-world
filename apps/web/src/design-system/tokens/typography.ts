export const typography = {
  fontFamily: {
    sans: [
      "ui-sans-serif",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      '"Noto Sans"',
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
      '"Noto Color Emoji"',
    ].join(", "),
    mono: [
      "ui-monospace",
      "SFMono-Regular",
      "Menlo",
      "Monaco",
      "Consolas",
      '"Liberation Mono"',
      '"Courier New"',
      "monospace",
    ].join(", "),
  },

  fontSize: {
    xs: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.025em" }],
    sm: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.025em" }],
    base: ["1rem", { lineHeight: "1.5rem", letterSpacing: "0.03em" }],
    lg: ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "0.03em" }],
    xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "0.035em" }],
    "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "0.04em" }],
    "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "0.04em" }],
    "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "0.045em" }],
    "5xl": ["3rem", { lineHeight: "1", letterSpacing: "0.05em" }],
    "6xl": ["3.75rem", { lineHeight: "1", letterSpacing: "0.05em" }],
    "7xl": ["4.5rem", { lineHeight: "1", letterSpacing: "0.05em" }],
    "8xl": ["6rem", { lineHeight: "1", letterSpacing: "0.05em" }],
    "9xl": ["8rem", { lineHeight: "1", letterSpacing: "0.05em" }],
  },

  fontWeight: {
    thin: "100",
    extralight: "200",
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  },

  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0em",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
} as const;

export type TypographyToken = typeof typography;
