<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import BaseProgressBarForBlockNumber from "$lib/base/BaseProgressBarForBlockNumber/BaseProgressBarForBlockNumber.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import type { SyncStatusContract } from "@db/dbTypes";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { NO_DATA } from "@utils/utilsConstants";
  import classNames from "classnames";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
    targetContract: Contract;
  }

  let { targetChain, targetProject, targetVersion, targetContract }: Props =
    $props();
  const gridSize: BaseSize = sizeSettings.grid;

  let latestBlockNumber: number = $derived(
    $storeChainStatus[targetChain.name].latestBlockNumber,
  );

  let targetContractSyncStatus: SyncStatusContract | undefined = $derived(
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name],
  );

  let fetchedBlockNumber: number | undefined = $derived(
    targetContractSyncStatus
      ? targetContractSyncStatus.fetchedBlockNumber
      : undefined,
  );
</script>

{#if targetContractSyncStatus && fetchedBlockNumber}
  <div class={classNames("h-full", "w-full", "flex", "items-center")}>
    <BaseProgressBarForBlockNumber
      startBlockNumber={targetContract.creation.blockNumber}
      colorCategoryFront={colorSettings.gridContainer}
      colorCategoryBg={colorSettings.gridContainer}
      {fetchedBlockNumber}
      endBlockNumber={latestBlockNumber}
      size={changeSize(gridSize, -1)}
      showBlockNumber={false}
      shadowBar={false}
      processing={targetContractSyncStatus.isSyncing}
      rounded
    />
  </div>
{:else}
  <BaseLabel text={NO_DATA} textSize={gridSize} />
{/if}
