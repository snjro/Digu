<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseA from "$lib/base/BaseA.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { convertTabValueForHref } from "$lib/base/BasePage/BasePageContainerContent.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type { AbiFragmentName } from "@constants/chains/types";
  import type { ContractIdentifier } from "@db/dbTypes";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { numberWithCommas } from "@utils/utilsCommon";

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
    "Event Logs (text)",
  )}`;

  let text: string;
  $: text = numberWithCommas(currentRecordCount);

  const textSize: BaseSize = sizeSettings.grid;
</script>

{#if currentRecordCount > 0}
  <BaseA {text} {href} {textSize} openNewTab={false} />
{:else}
  <BaseLabel {text} {textSize} />
{/if}
