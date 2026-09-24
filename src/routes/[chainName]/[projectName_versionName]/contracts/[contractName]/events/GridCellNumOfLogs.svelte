<script lang="ts">
  import { convertTabValueForHref } from "$lib/PageWrapper/PageWrapper.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseA from "$lib/base/BaseA.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type { AbiFragmentName } from "@constants/chains/types";
  import type { ContractIdentifier } from "@db/dbTypes";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { numberWithCommas } from "@utils/utilsCommon";

  interface Props {
    contractIdentifier: ContractIdentifier;
    targetEventName: AbiFragmentName;
    urlPathName: string;
  }

  let { contractIdentifier, targetEventName, urlPathName }: Props = $props();

  // undefined for events that are not synced (anonymous events), and for
  // contracts that have only anonymous events
  let currentRecordCount: number | undefined = $derived(
    $storeSyncStatus[contractIdentifier.chainName].subSyncStatuses[
      contractIdentifier.projectName
    ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses[
      contractIdentifier.contractName
    ]?.events[targetEventName]?.recordCount,
  );

  const href: string = $derived(
    `${urlPathName}${targetEventName}${convertTabValueForHref(
      "Event Logs (text)",
    )}`,
  );
  let text: string = $derived(
    currentRecordCount === undefined
      ? "-"
      : numberWithCommas(currentRecordCount),
  );

  const textSize: BaseSize = sizeSettings.grid;
</script>

{#if currentRecordCount !== undefined && currentRecordCount > 0}
  <BaseA {text} {href} {textSize} openNewTab={false} />
{:else}
  <BaseLabel {text} {textSize} />
{/if}
