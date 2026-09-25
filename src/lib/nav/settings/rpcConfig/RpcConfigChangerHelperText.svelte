<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { baseTextHeight, type BaseSize } from "$lib/base/baseSizes";
  import type { ChainName } from "@constants/chains/types";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import classNames from "classnames";
  import type { RpcConfigParam } from "./rpcConfigParams";
  import type { HelperTextState } from "$lib/base/helperTextState";
  import { getRpcConfigHelperTextProps } from "./rpcConfigHelperText";

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

  let helperLabelProps = $derived(() =>
    getRpcConfigHelperTextProps(
      helperTextState,
      rpcConfigMinValue,
      rpcConfigMaxValue,
    ),
  );
  const size: BaseSize = sizeSettings.navInputHelperText;
</script>

{#if helperTextState}
  <BaseLabel {...helperLabelProps()} textSize={size} />
{:else}
  <div class={classNames(baseTextHeight[size])}></div>
{/if}
