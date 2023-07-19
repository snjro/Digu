<script lang="ts" context="module">
  type HeaderName = "Start" | "Current" | "Goal";
  export function getBlockNumberByHeaderName(
    headerName: HeaderName,
    latestBlockNumber: number,
    targetContractSyncStatus: SyncStatusContract
  ): number {
    if (!targetContractSyncStatus) {
      // When a contract has no event, "targetContractSyncStatus" is undefined.
      return 0;
    }
    if (headerName === "Goal") {
      return latestBlockNumber;
    } else if (headerName === "Current") {
      return targetContractSyncStatus.fetchedBlockNumber;
    } else {
      return targetContractSyncStatus.creationBlockNumber;
    }
  }
</script>

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
  export let headerName: HeaderName;
  const girdSize: BaseSize = sizeSettings.grid;

  let latestBlockNumber: number;
  $: latestBlockNumber = $storeChainStatus[targetChain.name].latestBlockNumber;

  let targetContractSyncStatus: SyncStatusContract;
  $: targetContractSyncStatus =
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name];

  let blockNumber: number;
  $: blockNumber = getBlockNumberByHeaderName(
    headerName,
    latestBlockNumber,
    targetContractSyncStatus
  );
</script>

{#if targetContractSyncStatus}
  <CommonChainExplorerLink
    subdirectory="block"
    value={blockNumber.toString()}
    textSize={girdSize}
  />
{:else}
  <BaseLabel text={NO_DATA} textSize={girdSize} />
{/if}
