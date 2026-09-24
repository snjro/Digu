<script lang="ts" module>
  export type HelperTextState =
    "error" | "success" | "warning" | "info" | "indeterminate" | undefined;
</script>

<script lang="ts">
  import type { ChainName } from "@constants/chains/types";
  import { storeRpcSettings } from "@stores/storeRpcSettings";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import classNames from "classnames";
  import type { RpcConfigParam } from "./RpcConfig.svelte";
  import RpcConfigChangerHelperText from "./RpcConfigChangerHelperText.svelte";
  import RpcConfigChangerInput from "./RpcConfigChangerInput.svelte";
  import RpcConfigChangerRange from "./RpcConfigChangerRange.svelte";
  import { updateDbItemRpcSettings } from "@db/dbSettings";
  import { untrack } from "svelte";

  interface Props {
    targetChainName: ChainName;
    rpcConfigParam: RpcConfigParam;
    initializeValue: boolean;
  }

  let { targetChainName, rpcConfigParam, initializeValue }: Props = $props();

  let isSyncingChain = $derived($storeSyncStatus[targetChainName].isSyncing);
  let storedValue = $derived(
    $storeRpcSettings[targetChainName][rpcConfigParam.name],
  );

  let helperTextState: HelperTextState = $state(undefined);

  $effect.pre(() => {
    if (initializeValue) {
      // Rerun only when initializeValue changes, not when the store changes.
      untrack(initialization);
    }
  });
  function initialization(): void {
    helperTextState = undefined;
    storedValue = $storeRpcSettings[targetChainName][rpcConfigParam.name];
  }
  async function updateNumberItemValue(newValue: number): Promise<void> {
    helperTextState = "indeterminate";
    if (
      rpcConfigParam.minValue <= newValue &&
      newValue <= rpcConfigParam.maxValue
    ) {
      await updateDbItemRpcSettings(
        targetChainName,
        rpcConfigParam.name,
        newValue,
      );
      helperTextState = "success";
    } else {
      helperTextState = "error";
    }
  }
  async function change(newValue: number) {
    await updateNumberItemValue(newValue);
  }
</script>

{#key initializeValue}
  <div
    class={classNames(
      "flex",
      "flex-row",
      "items-center",
      "space-x-3",
      "pt-1.5",
    )}
  >
    <RpcConfigChangerInput
      {helperTextState}
      bind:value={storedValue}
      disabled={isSyncingChain}
      onchange={change}
    />
    <RpcConfigChangerRange
      disabled={isSyncingChain}
      value={storedValue}
      {rpcConfigParam}
      onchange={change}
    />
  </div>
  <div class={classNames("col-span-full")}>
    <RpcConfigChangerHelperText
      {targetChainName}
      {rpcConfigParam}
      {helperTextState}
    />
  </div>
{/key}
