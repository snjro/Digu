<script lang="ts">
  import type { AbiFragmentName } from "@constants/chains/types";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import type { ContractIdentifier } from "@db/dbTypes";
  import BaseA from "$lib/base/BaseA.svelte";
  import { numberWithCommas } from "@utils/utilsCommon";

  export let contractIdentifier: ContractIdentifier;
  export let targetEventName: AbiFragmentName;
  export let urlPathName: string;

  let recordCount: number;
  $: recordCount =
    $storeSyncStatus[contractIdentifier.chainName].subSyncStatuses[
      contractIdentifier.projectName
    ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses[
      contractIdentifier.contractName
    ].events[targetEventName].recordCount;
  const href: string = `${urlPathName}/${targetEventName}`;
</script>

{#if recordCount > 0}
  <BaseA
    text={numberWithCommas(recordCount)}
    {href}
    textSize={sizeSettings.grid}
    openNewTab={false}
  />
{:else}
  <BaseLabel
    text={numberWithCommas(recordCount)}
    textSize={sizeSettings.grid}
  />
{/if}
