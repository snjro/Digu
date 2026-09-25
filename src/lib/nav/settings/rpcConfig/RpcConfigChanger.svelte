<script lang="ts">
  import type { HelperTextState } from "$lib/base/helperTextState";
  import type { ChainName } from "@constants/chains/types";
  import { storeRpcSettings } from "@stores/storeRpcSettings";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import classNames from "classnames";
  import type { RpcConfigParam } from "./rpcConfigParams";
  import { isInRpcConfigRange } from "./rpcConfigValidation";
  import { saveRpcConfigValue } from "./rpcConfigSave";
  import RpcConfigChangerHelperText from "./RpcConfigChangerHelperText.svelte";
  import RpcConfigChangerInput from "./RpcConfigChangerInput.svelte";
  import RpcConfigChangerRange from "./RpcConfigChangerRange.svelte";
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
  $effect.pre(() => {
    if (isSyncingChain && helperTextState === "error") {
      // The invalid value was not saved, so show the saved one while syncing.
      untrack(initialization);
    }
  });
  function initialization(): void {
    helperTextState = undefined;
    storedValue = $storeRpcSettings[targetChainName][rpcConfigParam.name];
  }
  async function updateNumberItemValue(newValue: number): Promise<void> {
    helperTextState = "indeterminate";
    if (isInRpcConfigRange(rpcConfigParam, newValue)) {
      await saveRpcConfigValue(targetChainName, rpcConfigParam.name, newValue);
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
      {rpcConfigParam}
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
