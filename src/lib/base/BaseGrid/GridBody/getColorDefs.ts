import {
  getColorFromTailwindColor,
  type ColorCategory,
  colorDefinitions,
} from "$lib/appearanceConfig/color/colorDefinitions";
import type { ThemeColor } from "@db/dbTypes";
export function getColorDefinitionsForGrid(
  themeColor: ThemeColor,
  colorCategoryGridHeader: ColorCategory,
  colorCategoryGridRow: ColorCategory,
) {
  const colorDef = {
    frame: {
      border: getColorFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridHeader].border,
      ),
    },
    header: {
      text: getColorFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridHeader].text,
      ),
      bg: getColorFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridHeader].bg,
      ),
    },
    row: {
      text: getColorFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridRow].text,
      ),
      bg: getColorFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridRow].bg,
      ),
      border: getColorFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridRow].border,
      ),
      hover: getColorFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridRow].bgHover,
      ),
    },
  };
  return colorDef;
}
