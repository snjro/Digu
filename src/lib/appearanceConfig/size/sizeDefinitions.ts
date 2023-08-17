export type BreakPointWidthKey = "sm" | "md" | "lg" | "xl" | "2xl";

// The values in "tailwind.config.js" must be sync with the values here.
// Ref: https://tailwindcss.com/docs/screens
export const breakPointWidths: { [key in BreakPointWidthKey]: number } = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};
export type BreakPointWidthValue =
  (typeof breakPointWidths)[keyof typeof breakPointWidths];

export const breakPointWidthThresholds: Record<string, BreakPointWidthValue> = {
  grigFunctionButtonForOpenedSidebar: breakPointWidths.lg,
  navButtonForOpenedSidebar: breakPointWidths.md,
  navSyncStatusForOpenedSidebar: breakPointWidths.md,
};
