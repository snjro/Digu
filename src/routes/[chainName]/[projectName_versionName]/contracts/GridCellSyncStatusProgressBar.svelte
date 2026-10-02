<script lang="ts">
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import BaseProgressBarForBlockNumber from "#lib/base/BaseProgressBarForBlockNumber/BaseProgressBarForBlockNumber.svelte";
  import { changeSize, type BaseSize } from "#lib/base/baseSizes.js";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "#constants/chains/types.js";
  import type { SyncStatusContract } from "#db/dbTypes.js";
  import { storeChainStatus } from "#stores/storeChainStatus.js";
  import { storeSyncStatus } from "#stores/storeSyncStatus.js";
  import { NO_DATA } from "#utils/utilsConstants.js";
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
