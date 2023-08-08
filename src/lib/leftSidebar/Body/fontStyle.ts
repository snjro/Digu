import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

export function getFrontColorCategory(
  isSelected: boolean,
  isUpdated = false
): ColorCategory {
  if (isSelected) {
    return "interactive";
  } else if (isUpdated) {
    return "success";
  } else {
    return colorSettings.leftSidebarBodyFront;
  }
}
