export type CellAlignPosition = "start" | "center" | "end";
export const cellAlign = (
  cellAlignPosition: CellAlignPosition = "start"
): {
  display: "flex";
  "justify-content": "flex-start" | "center" | "flex-end";
} => {
  return {
    display: "flex",
    "justify-content":
      cellAlignPosition === "center"
        ? cellAlignPosition
        : `flex-${cellAlignPosition}`,
  };
};
