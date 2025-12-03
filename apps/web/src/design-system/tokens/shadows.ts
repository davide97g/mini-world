export const shadows = {
  // Standard shadows
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
  base: "0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)",
  none: "none",

  // EV Glow shadows
  evGlow: "0 0 10px rgba(0, 255, 198, 0.3), 0 0 20px rgba(184, 108, 255, 0.2)",
  evGlowSm: "0 0 5px rgba(0, 255, 198, 0.2)",
  evGlowLg:
    "0 0 20px rgba(0, 255, 198, 0.4), 0 0 40px rgba(184, 108, 255, 0.3)",
  evInnerGlow: "inset 0 0 10px rgba(0, 255, 198, 0.2)",

  // EE Glow shadows
  eeGlow: "0 0 10px rgba(242, 242, 242, 0.4), 0 0 20px rgba(255, 217, 59, 0.3)",
  eeGlowSm: "0 0 5px rgba(242, 242, 242, 0.3)",
  eeGlowLg:
    "0 0 20px rgba(242, 242, 242, 0.5), 0 0 40px rgba(255, 217, 59, 0.4)",
  eeRimLight:
    "0 0 0 1px rgba(242, 242, 242, 0.3), 0 0 10px rgba(255, 217, 59, 0.2)",
} as const;

export type ShadowToken = typeof shadows;
