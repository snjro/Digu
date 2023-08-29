<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel, { type BaseLabelProps } from "$lib/base/BaseLabel.svelte";
  import { baseTextHeight, type BaseSize } from "$lib/base/baseSizes";
  import type { ChainName } from "@constants/chains/types";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import classNames from "classnames";
  import type { RpcConfigParam } from "./RpcConfig.svelte";
  import type { HelperTextState } from "./RpcConfigChanger.svelte";

  export let targetChainName: ChainName;
  export let helperTextState: HelperTextState;
  export let rpcConfigParam: RpcConfigParam;
  const rpcConfigMinValue: RpcConfigParam["minValue"] = rpcConfigParam.minValue;
  const rpcConfigMaxValue: RpcConfigParam["maxValue"] = rpcConfigParam.maxValue;
  $: isSyncingChain = $storeSyncStatus[targetChainName].isSyncing;

  $: if (isSyncingChain && helperTextState === "error") {
    helperTextState = undefined;
  }

  $: helperLabelProps = (): BaseLabelProps => {
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
  };
  const size: BaseSize = sizeSettings.navInputHelperText;
</script>

{#if helperTextState}
  <BaseLabel {...helperLabelProps()} textSize={size} />
{:else}
  <div class={classNames(baseTextHeight[size])} />
{/if}
