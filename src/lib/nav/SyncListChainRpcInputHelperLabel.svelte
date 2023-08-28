<script lang="ts">
  import BaseLabel, { type BaseLabelProps } from "$lib/base/BaseLabel.svelte";
  import classNames from "classnames";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeRpcSettings } from "@stores/storeRpcSettings";
  import type { BaseSize } from "$lib/base/baseSizes";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  const size: BaseSize = sizeSettings.navInputHelperText;
  $: targetChainName = $storeUserSettings.selectedChainName.toString();
  $: nodeStatus = $storeChainStatus[targetChainName].nodeStatus;
  $: rpc = $storeRpcSettings[targetChainName].rpc;

  $: helperLabelProps = (): BaseLabelProps => {
    let labelProps: BaseLabelProps;
    switch (nodeStatus) {
      case "SUCCESS": {
        labelProps = {
          prefixIcon: {
            name: "checkBold",
            colorCategory: "success",
          },
          text: "Connected.",
          colorCategoryFront: colorSettings.navText,
        };
        break;
      }
      case "CONNECTING": {
        labelProps = {
          prefixIcon: {
            name: "sync",
            colorCategory: colorSettings.navText,
            appendClass: "animate-spin",
          },
          text: "Connecting...",
          colorCategoryFront: colorSettings.navText,
        };
        break;
      }
      default: {
        let errorMessage: string | undefined = undefined;
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
  };
</script>

<div class={classNames("ml-2")}>
  <BaseLabel {...helperLabelProps()} />
</div>
