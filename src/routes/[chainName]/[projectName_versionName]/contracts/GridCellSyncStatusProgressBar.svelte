<script lang="ts">
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import BaseProgressBarForBlockNumber from "$lib/base/BaseProgressBarForBlockNumber/BaseProgressBarForBlockNumber.svelte";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import type { SyncStatusContract } from "@db/dbTypes";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import { NO_DATA } from "@utils/utilsCostants";
  import classNames from "classnames";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
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
</script>

{#if fetchedBlockNumber}
  <div class={classNames("h-full", "flex", "items-center")}>
    <BaseProgressBarForBlockNumber
      startBlockNumber={targetContract.creation.blockNumber}
      colorCategoryFront={colorSettings.gridContainer}
      colorCategoryBg={colorSettings.gridContainer}
      {fetchedBlockNumber}
      endBlockNumber={latestBlockNumber}
      size={changeSize(girdSize, -1)}
      showBlockNumber={false}
      shadowBar={false}
      processing={targetContractSyncStatus.isSyncing}
      rounded
    />
  </div>
{:else}
  <BaseLabel text={NO_DATA} textSize={girdSize} />
{/if}
