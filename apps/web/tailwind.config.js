/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./.storybook/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class"],
  safelist: [
    "ev-glow",
    "ev-glow-sm",
    "ev-glow-lg",
    "ev-glow-hover",
    "ev-inner-glow",
    "ee-glow",
    "ee-glow-sm",
    "ee-glow-lg",
    "ee-glow-hover",
    "ee-rim-light",
    "bio-border",
    "noise-bg",
    "ev-pulse",
    "ee-flicker",
    "focus-visible:ev-glow-sm",
    "focus-visible:ee-glow-sm",
    "hover:ev-glow",
    "hover:ee-glow",
    "hover:ev-glow-hover",
    "hover:ee-glow-hover",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/ui CSS variables (BioTech theme)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // BioTech Collapse Theme Colors
        ev: {
          teal: "#00ffc6",
          purple: "#b86cff",
          tealDark: "#00cc9e",
          purpleDark: "#9455cc",
          glow: "rgba(0, 255, 198, 0.3)",
          glowPurple: "rgba(184, 108, 255, 0.3)",
        },
        ee: {
          white: "#f2f2f2",
          yellow: "#ffd93b",
          yellowDark: "#ccad2f",
          metal: "#4a4a4a",
          glow: "rgba(242, 242, 242, 0.4)",
          glowYellow: "rgba(255, 217, 59, 0.4)",
        },
        danger: {
          toxic: "#7cff1e",
          rust: "#d2553f",
          toxicDark: "#63cc18",
          rustDark: "#a84432",
        },
        // Legacy grays
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
      },
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
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace",
        ],
      },
      letterSpacing: {
        wider: "0.05em",
        widest: "0.1em",
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "3px",
        md: "6px",
        lg: "10px",
        radius: "var(--radius)",
        "radius-md": "calc(var(--radius) - 2px)",
        "radius-sm": "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
        base: "0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
        "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)",
        // EV Glow shadows
        "ev-glow":
          "0 0 10px rgba(0, 255, 198, 0.3), 0 0 20px rgba(184, 108, 255, 0.2)",
        "ev-glow-sm": "0 0 5px rgba(0, 255, 198, 0.2)",
        "ev-glow-lg":
          "0 0 20px rgba(0, 255, 198, 0.4), 0 0 40px rgba(184, 108, 255, 0.3)",
        "ev-inner": "inset 0 0 10px rgba(0, 255, 198, 0.2)",
        // EE Glow shadows
        "ee-glow":
          "0 0 10px rgba(242, 242, 242, 0.4), 0 0 20px rgba(255, 217, 59, 0.3)",
        "ee-glow-sm": "0 0 5px rgba(242, 242, 242, 0.3)",
        "ee-glow-lg":
          "0 0 20px rgba(242, 242, 242, 0.5), 0 0 40px rgba(255, 217, 59, 0.4)",
        "ee-rim":
          "0 0 0 1px rgba(242, 242, 242, 0.3), 0 0 10px rgba(255, 217, 59, 0.2)",
      },
    },
  },
  plugins: [],
};
