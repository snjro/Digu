import type { ColorCategory } from "#lib/appearanceConfig/color/colorDefinitions.js";
import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";

export function getFrontColorCategory(
  isSelected: boolean,
  isUpdated = false,
): ColorCategory {
  if (isSelected) {
    return "interactive";
  } else if (isUpdated) {
    return "success";
  } else {
    return colorSettings.leftSidebarBodyFront;
  }
}
