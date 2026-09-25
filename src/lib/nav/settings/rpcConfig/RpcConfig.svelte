<script lang="ts">
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import type { Chain, ChainName } from "@constants/chains/types";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utilsDb";
  import RpcConfigChanger from "./RpcConfigChanger.svelte";
  import { getRpcConfigParams } from "./rpcConfigParams";

  interface Props {
    initializeValue: boolean;
  }

  let { initializeValue }: Props = $props();
  let targetChainName: ChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );

  let targetChain: Chain = $derived(
    getTargetChain({ chainName: targetChainName }),
  );

  let rpcConfigParams = $derived(getRpcConfigParams(targetChain));
</script>

{#each rpcConfigParams as rpcConfigParam}
  <CommonItemMember text={rpcConfigParam.label}>
    <RpcConfigChanger {targetChainName} {rpcConfigParam} {initializeValue} />
  </CommonItemMember>
{/each}
