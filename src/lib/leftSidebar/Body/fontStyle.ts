import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

export function getFrontWeight(
  isSelected: boolean,
  isHover: boolean
): "font-medium" | "font-normal" | "font-bold" {
  if (isHover) {
    // return "font-bold";
    return "font-bold";
  } else if (isSelected) {
    return "font-bold";
  } else {
    return "font-normal";
  }
}
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
