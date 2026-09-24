<script lang="ts" module>
  type HeaderName = "Start" | "Current" | "Goal";
  export function getBlockNumberByHeaderName(
    headerName: HeaderName,
    latestBlockNumber: number,
    targetContractSyncStatus: SyncStatusContract,
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
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import CommonChainExplorerLink from "$lib/common/CommonChainExplorerLink.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import type { SyncStatusContract } from "@db/dbTypes";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { NO_DATA } from "@utils/utilsCostants";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
    targetContract: Contract;
    headerName: HeaderName;
  }

  let {
    targetChain,
    targetProject,
    targetVersion,
    targetContract,
    headerName,
  }: Props = $props();
  const girdSize: BaseSize = sizeSettings.grid;

  let latestBlockNumber: number = $derived(
    $storeChainStatus[targetChain.name].latestBlockNumber,
  );

  let targetContractSyncStatus: SyncStatusContract = $derived(
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name],
  );

  let blockNumber: number = $derived(
    getBlockNumberByHeaderName(
      headerName,
      latestBlockNumber,
      targetContractSyncStatus,
    ),
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
