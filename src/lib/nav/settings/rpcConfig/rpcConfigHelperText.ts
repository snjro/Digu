import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import type { BaseLabelProps } from "$lib/base/BaseLabel.svelte";
import type { RpcConfigParam } from "./rpcConfigParams";
import type { HelperTextState } from "./RpcConfigChanger.svelte";

export function getRpcConfigHelperTextProps(
  helperTextState: HelperTextState,
  rpcConfigMinValue: RpcConfigParam["minValue"],
  rpcConfigMaxValue: RpcConfigParam["maxValue"],
): BaseLabelProps {
  switch (helperTextState) {
    case "success": {
      return {
        prefixIcon: {
          name: "checkBold",
          colorCategory: "success",
        },
        text: "Updated.",
        colorCategoryFront: colorSettings.navSettings,
      };
    }
    case "indeterminate": {
      return {
        text: "Checking...",
        colorCategoryFront: colorSettings.navSettings,
      };
    }
    case "error": {
      return {
        prefixIcon: {
          name: "close",
          colorCategory: "error",
        },
        text: `Error. The range should be ${rpcConfigMinValue}-${rpcConfigMaxValue}`,
        colorCategoryFront: "error",
      };
    }
    default: {
      return {
        prefixIcon: undefined,
        text: undefined,
        colorCategoryFront: undefined,
      };
    }
  }
}
