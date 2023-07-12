import {
  getColorHexWithSharpFromTailwindColor,
  type ColorCategory,
  colorDefinitions,
} from "$lib/appearanceConfig/color/colorDefinitions";
import type { ThemeColor } from "@db/dbTypes";
export function getColorDefinitionsForGrid(
  themeColor: ThemeColor,
  colorCategoryGridHeader: ColorCategory,
  colorCategoryGridRow: ColorCategory
) {
  const colorDef = {
    frame: {
      border: getColorHexWithSharpFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridHeader].border
      ),
    },
    header: {
      text: getColorHexWithSharpFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridHeader].text
      ),
      bg: getColorHexWithSharpFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridHeader].bg
      ),
    },
    row: {
      text: getColorHexWithSharpFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridRow].text
      ),
      bg: getColorHexWithSharpFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridRow].bg
      ),
      border: getColorHexWithSharpFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridRow].border
      ),
      hover: getColorHexWithSharpFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryGridRow].bgHover
      ),
    },
  };
  return colorDef;
}
