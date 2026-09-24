<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel, { type BaseLabelProps } from "$lib/base/BaseLabel.svelte";
  import { baseTextHeight, type BaseSize } from "$lib/base/baseSizes";
  import type { ChainName } from "@constants/chains/types";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import classNames from "classnames";
  import type { RpcConfigParam } from "./rpcConfigParams";
  import type { HelperTextState } from "./RpcConfigChanger.svelte";

  interface Props {
    targetChainName: ChainName;
    helperTextState: HelperTextState;
    rpcConfigParam: RpcConfigParam;
  }

  let { targetChainName, helperTextState, rpcConfigParam }: Props = $props();
  let rpcConfigMinValue: RpcConfigParam["minValue"] = $derived(
    rpcConfigParam.minValue,
  );
  let rpcConfigMaxValue: RpcConfigParam["maxValue"] = $derived(
    rpcConfigParam.maxValue,
  );
  let isSyncingChain = $derived($storeSyncStatus[targetChainName].isSyncing);

  $effect.pre(() => {
    if (isSyncingChain && helperTextState === "error") {
      helperTextState = undefined;
    }
  });

  let helperLabelProps = $derived((): BaseLabelProps => {
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
  });
  const size: BaseSize = sizeSettings.navInputHelperText;
</script>

{#if helperTextState}
  <BaseLabel {...helperLabelProps()} textSize={size} />
{:else}
  <div class={classNames(baseTextHeight[size])}></div>
{/if}
