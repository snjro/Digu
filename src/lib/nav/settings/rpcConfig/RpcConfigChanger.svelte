<script lang="ts" context="module">
  export type HelperTextState =
    | "error"
    | "success"
    | "warning"
    | "info"
    | "indeterminate"
    | undefined;
</script>

<script lang="ts">
  import type { ChainName } from "@constants/chains/types";
  import type { RpcConfigParam } from "./RpcConfig.svelte";
  import { updateDbItemLogSettings } from "@db/dbSettingsDataHandlers";
  import RpcConfigChangerInput from "./RpcConfigChangerInput.svelte";
  import RpcConfigChangerRange from "./RpcConfigChangerRange.svelte";
  import RpcConfigChangerHelperText from "./RpcConfigChangerHelperText.svelte";
  import classNames from "classnames";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { storeLogSettings } from "@stores/storeLogSettings";

  export let targetChainName: ChainName;
  export let rpcConfigParam: RpcConfigParam;
  export let initializeValue: boolean;

  $: isSyncingChain = $storeSyncStatus[targetChainName].isSyncing;
  $: storedValue = $storeLogSettings[targetChainName][rpcConfigParam.name];

  $: {
    if (initializeValue) {
      initialization();
    }
  }
  function initialization(): void {
    helperTextState = undefined;
    storedValue = $storeLogSettings[targetChainName][rpcConfigParam.name];
  }
  let helperTextState: HelperTextState = undefined;
  async function updateNumberItemValue(newValue: number): Promise<void> {
    helperTextState = "indeterminate";
    if (
      rpcConfigParam.minValue <= newValue &&
      newValue <= rpcConfigParam.maxValue
    ) {
      await updateDbItemLogSettings(
        targetChainName,
        rpcConfigParam.name,
        newValue
      );
      helperTextState = "success";
    } else {
      helperTextState = "error";
    }
  }
  async function change(customEvent: CustomEvent) {
    await updateNumberItemValue(customEvent.detail.newValue);
  }
</script>

{#key initializeValue}
  <div class={classNames("flex", "flex-row", "items-center", "space-x-3")}>
    <RpcConfigChangerInput
      {helperTextState}
      bind:value={storedValue}
      disabled={isSyncingChain}
      on:change={change}
    />
    <RpcConfigChangerRange
      disabled={isSyncingChain}
      value={storedValue}
      {rpcConfigParam}
      on:change={change}
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
