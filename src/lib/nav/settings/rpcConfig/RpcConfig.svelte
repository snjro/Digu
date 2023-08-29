<script lang="ts" context="module">
  type RpcConfigKeyName = keyof Pick<
    RpcSetting,
    "bulkUnit" | "tryCount" | "blockIntervalMs" | "abortWatchIntervalMs"
  >;
  export type RpcConfigParam = {
    readonly name: RpcConfigKeyName;
    readonly label: string;
    readonly minValue: number;
    readonly maxValue: number;
    step: number;
  };
</script>

<script lang="ts">
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import type { Chain, ChainName } from "@constants/chains/types";
  import type { RpcSetting } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utlisDb";
  import RpcConfigChanger from "./RpcConfigChanger.svelte";

  export let initializeValue: boolean;
  let targetChainName: ChainName;
  $: targetChainName = $storeUserSettings.selectedChainName.toString();
  let targetChain: Chain;
  $: targetChain = getTargetChain({ chainName: targetChainName });
  $: rpcConfigParams = (): RpcConfigParam[] => {
    return [
      {
        name: "bulkUnit",
        label: "Bulk Unit",
        minValue: 1,
        maxValue: 10000,
        step: 1,
      },
      {
        name: "tryCount",
        label: "Try Count",
        minValue: 1,
        maxValue: 10,
        step: 1,
      },
      {
        name: "blockIntervalMs",
        label: "Block Interval [ms]",
        minValue: 1,
        maxValue: targetChain.blockIntervalMs,
        step: 1,
      },
      {
        name: "abortWatchIntervalMs",
        label: "Abort Watch Interval [ms]",
        minValue: 1,
        maxValue: targetChain.abortWatchIntervalMs,
        step: 1,
      },
    ];
  };
</script>

{#each rpcConfigParams() as rpcConfigParam}
  <CommonItemMember text={rpcConfigParam.label}>
    <RpcConfigChanger {targetChainName} {rpcConfigParam} {initializeValue} />
  </CommonItemMember>
{/each}
