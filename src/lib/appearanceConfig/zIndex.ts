export const zIndex = {
  snackbar: "z-50",
  leftSidebar: "z-10",
  tooltip: "z-10",
  fullScreen: "z-10",
  threeDotsMenu: "z-50",
  syncPanel: "z-20",
  loadingSpinner: "z-50",
} as const satisfies Record<string, `z-${number}`>;
