import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
import type { BaseLabelProps } from "#lib/base/BaseLabel.svelte";
import type { BaseSize } from "#lib/base/baseSizes.js";
import type { NodeStatus } from "#db/dbTypes.js";
import classNames from "classnames";

export function getRpcInputHelperLabelProps(
  nodeStatus: NodeStatus,
  rpc: string,
): BaseLabelProps {
  const size: BaseSize = sizeSettings.navInputHelperText;
  let labelProps: BaseLabelProps;
  switch (nodeStatus) {
    case "SUCCESS": {
      labelProps = {
        prefixIcon: {
          name: "checkBold",
          colorCategory: "success",
        },
        text: "Connected.",
        textSize: size,
        colorCategoryFront: colorSettings.navText,
      };
      break;
    }
    case "CONNECTING": {
      labelProps = {
        prefixIcon: {
          name: "sync",
          colorCategory: colorSettings.navText,
          appendClass: "motion-safe:animate-spin",
        },
        text: "Connecting...",
        textSize: size,
        colorCategoryFront: colorSettings.navText,
      };
      break;
    }
    default: {
      let errorMessage: string | undefined;
      switch (nodeStatus) {
        case "INVALID_PROTOCOL": {
          errorMessage = `Error. Protocol is invalid.`;
          break;
        }
        case "INVALID_URL": {
          if (rpc) {
            errorMessage = "Error. Invalid URL.";
          } else {
            errorMessage = "Enter URL of RPC.";
          }
          break;
        }
        case "WRONG_CHAIN": {
          errorMessage = "Error. Target chain is wrong.";
          break;
        }
        case "NETWORK_ERROR": {
          errorMessage = "Error. cannot get a network data.";
          break;
        }
        default: {
          errorMessage = undefined;
          break;
        }
      }
      labelProps = {
        prefixIcon: errorMessage?.startsWith("Error")
          ? {
              name: "close",
              colorCategory: "error",
            }
          : undefined,
        text: errorMessage,
        textSize: size,
        colorCategoryFront: "error",
      };
    }
  }
  if (labelProps.prefixIcon) {
    labelProps.prefixIcon.size = size;
  }
  labelProps.appendClass = classNames("whitespace-pre-wrap");
  return labelProps;
}
