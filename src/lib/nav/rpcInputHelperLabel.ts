import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
import type { BaseLabelProps } from "#lib/base/BaseLabel.svelte";
import type { BaseSize } from "#lib/base/baseSizes.js";
import type { NodeStatus } from "#db/dbTypes.js";
import type { SyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import classNames from "classnames";

// The section of the guide on how to get an RPC URL.
export const RPC_GUIDE_URL: string =
  "https://github.com/snjro/Digu/blob/develop/docs/getting-started-as-user/README.md#rpc-endpoint-url";

// helpHref: a link to the guide, shown after the text.
export type RpcInputHelperLabelProps = BaseLabelProps & { helpHref?: string };

const SYNC_STOPPED_TEXTS: Record<SyncStoppedReason, string> = {
  RPC_ERRORS: "Sync stopped: RPC errors. Try another RPC.",
  UNEXPECTED_ERROR: "Sync stopped: unexpected error.",
};

export function getRpcInputHelperLabelProps(
  nodeStatus: NodeStatus,
  rpc: string,
  syncStoppedReason?: SyncStoppedReason,
): RpcInputHelperLabelProps {
  const size: BaseSize = sizeSettings.navInputHelperText;
  let labelProps: RpcInputHelperLabelProps;
  switch (nodeStatus) {
    case "SUCCESS": {
      if (syncStoppedReason) {
        labelProps = {
          prefixIcon: {
            name: "close",
            colorCategory: "error",
          },
          text: SYNC_STOPPED_TEXTS[syncStoppedReason],
          textSize: size,
          colorCategoryFront: "error",
        };
        break;
      }
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
      let helpHref: string | undefined;
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
            helpHref = RPC_GUIDE_URL;
          }
          break;
        }
        case "WRONG_CHAIN": {
          errorMessage = "Error. Target chain is wrong.";
          break;
        }
        case "NETWORK_ERROR": {
          errorMessage = "Error. Cannot reach this RPC. Check the URL.";
          helpHref = RPC_GUIDE_URL;
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
      if (helpHref) {
        labelProps.helpHref = helpHref;
      }
    }
  }
  if (labelProps.prefixIcon) {
    labelProps.prefixIcon.size = size;
  }
  labelProps.appendClass = classNames("whitespace-pre-wrap");
  return labelProps;
}
