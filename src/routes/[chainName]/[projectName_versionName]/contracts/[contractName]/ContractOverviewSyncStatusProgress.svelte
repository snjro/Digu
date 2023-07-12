<script lang="ts">
  import BaseProgressCircle from "$lib/base/BaseProgressCircle/BaseProgressCircle.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import type { SyncStatusContract } from "@db/dbTypes";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { breakPointWidths } from "@utils/utilsDom";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;

  const itemSize: BaseSize = sizeSettings.itemMember;
  let targetContractSyncStatus: SyncStatusContract;
  $: targetContractSyncStatus =
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name];

  let latestBlockNumber: number;
  $: latestBlockNumber = $storeChainStatus[targetChain.name].latestBlockNumber;
  let fetchedBlockNumber: number | undefined;
  $: fetchedBlockNumber = targetContractSyncStatus
    ? targetContractSyncStatus.fetchedBlockNumber
    : undefined;
  let detailsTextSize: BaseSize;
  $: detailsTextSize =
    $storeNoDbCurrentWidth > breakPointWidths.sm
      ? itemSize
      : changeSize(itemSize, -1);
</script>

<CommonItemMember text="Progress">
  <BaseProgressCircle
    startValue={targetContract.creation.blockNumber}
    currentValue={fetchedBlockNumber ?? targetContract.creation.blockNumber}
    goalValue={latestBlockNumber}
    detailsPosition={$storeNoDbCurrentWidth > breakPointWidths.lg
      ? "bottom"
      : "right"}
    circleSize={changeSize(itemSize, 1)}
    {detailsTextSize}
  />
</CommonItemMember>
