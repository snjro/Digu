<script lang="ts">
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import type { SyncStatusContract } from "@db/dbTypes";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { NO_DATA } from "@utils/utilsCostants";
  import CommonChainExplorerLink from "$lib/common/CommonChainExplorerLink.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { BaseSize } from "$lib/base/baseSizes";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
  export let headerName: "Start" | "Current" | "Goal";

  const girdSize: BaseSize = sizeSettings.grid;

  let latestBlockNumber: number;
  $: latestBlockNumber = $storeChainStatus[targetChain.name].latestBlockNumber;
  let targetContractSyncStatus: SyncStatusContract;
  $: targetContractSyncStatus =
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name];
  let fetchedBlockNumber: number | undefined;
  $: fetchedBlockNumber = targetContractSyncStatus
    ? targetContractSyncStatus.fetchedBlockNumber
    : undefined;
  let blockNumber = (): string => {
    let targetBlockNumer: number;
    if (headerName === "Goal") {
      targetBlockNumer = latestBlockNumber;
    } else if (headerName === "Current") {
      targetBlockNumer = fetchedBlockNumber ? fetchedBlockNumber : 0;
    } else {
      targetBlockNumer = targetContract.creation.blockNumber;
    }
    return targetBlockNumer.toString();
  };
</script>

{#if targetContractSyncStatus}
  <CommonChainExplorerLink
    subdirectory="block"
    value={blockNumber()}
    textSize={girdSize}
  />
{:else}
  <BaseLabel text={NO_DATA} textSize={girdSize} />
{/if}
