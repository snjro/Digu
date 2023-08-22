<script lang="ts">
  import type { AbiFragmentName } from "@constants/chains/types";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import type { ContractIdentifier } from "@db/dbTypes";
  import BaseA from "$lib/base/BaseA.svelte";
  import { numberWithCommas } from "@utils/utilsCommon";
  import { convertTabValueForHref } from "$lib/base/BasePage/BasePageContainerContent.svelte";

  export let contractIdentifier: ContractIdentifier;
  export let targetEventName: AbiFragmentName;
  export let urlPathName: string;
  let currentRecordCount: number = 0;
  $: currentRecordCount =
    $storeSyncStatus[contractIdentifier.chainName].subSyncStatuses[
      contractIdentifier.projectName
    ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses[
      contractIdentifier.contractName
    ].events[targetEventName].recordCount;

  const href: string = `${urlPathName}/${targetEventName}${convertTabValueForHref(
    "Event Logs (text)"
  )}`;
</script>

{#if currentRecordCount > 0}
  <BaseA
    text={numberWithCommas(currentRecordCount)}
    {href}
    textSize={sizeSettings.grid}
    openNewTab={false}
  />
{:else}
  <BaseLabel
    text={numberWithCommas(currentRecordCount)}
    textSize={sizeSettings.grid}
  />
{/if}
