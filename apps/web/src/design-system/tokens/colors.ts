export const colors = {
  // Base colors
  white: "#ffffff",
  black: "#000000",

  // BioTech Collapse Theme Colors
  // Base backgrounds
  background: {
    base: "#0f0f0f",
    elevated: "#161616",
    panel: "#1d1d1d",
    panelTinted: "#1c1c1c", // with slight green/teal tint
  },

  // Borders
  border: {
    default: "#313131",
    elevated: "#3a3a3a",
  },

  // Text
  text: {
    primary: "#e6e6e6",
    secondary: "#9ea0a0",
  },

  // EV (organic, glowing, teal/purple)
  ev: {
    teal: "#00ffc6",
    purple: "#b86cff",
    tealDark: "#00cc9e",
    purpleDark: "#9455cc",
    glow: "rgba(0, 255, 198, 0.3)",
    glowPurple: "rgba(184, 108, 255, 0.3)",
  },

  // EE (electric, harsh whites/yellows, metal)
  ee: {
    white: "#f2f2f2",
    yellow: "#ffd93b",
    yellowDark: "#ccad2f",
    metal: "#4a4a4a",
    glow: "rgba(242, 242, 242, 0.4)",
    glowYellow: "rgba(255, 217, 59, 0.4)",
  },

  // Danger colors
  danger: {
    toxic: "#7cff1e",
    rust: "#d2553f",
    toxicDark: "#63cc18",
    rustDark: "#a84432",
  },

  // Legacy grays (for compatibility)
  gray: {
    50: "#1d1d1d",
    100: "#2a2a2a",
    200: "#3a3a3a",
    300: "#4a4a4a",
    400: "#5a5a5a",
    500: "#6a6a6a",
    600: "#7a7a7a",
    700: "#8a8a8a",
    800: "#9a9a9a",
    900: "#aaaaaa",
    950: "#b0b0b0",
  },
} as const;

export type ColorToken = typeof colors;
