import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
import { colorVar } from "$lib/appearanceConfig/color/colorVariables";
export function getColorDefinitionsForGrid(
  colorCategoryGridHeader: ColorCategory,
  colorCategoryGridRow: ColorCategory,
) {
  const colorDef = {
    frame: {
      border: colorVar(colorCategoryGridHeader, "border"),
    },
    header: {
      text: colorVar(colorCategoryGridHeader, "text"),
      bg: colorVar(colorCategoryGridHeader, "bg"),
    },
    row: {
      text: colorVar(colorCategoryGridRow, "text"),
      bg: colorVar(colorCategoryGridRow, "bg"),
      border: colorVar(colorCategoryGridRow, "border"),
      hover: colorVar(colorCategoryGridRow, "bgHover"),
    },
  };
  return colorDef;
}
