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
  import type { SyncStateText, SyncStatusContract } from "@db/dbTypes";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { breakPointWidths } from "$lib/appearanceConfig/size/sizeDefinitions";

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
    $storeNoDbCurrentWidth <= breakPointWidths.md
      ? changeSize(itemSize, -1)
      : itemSize;

  let syncStateText: SyncStateText;
  $: syncStateText = targetContractSyncStatus.syncStateText;
</script>

<CommonItemMember text="Progress">
  <BaseProgressCircle
    startValue={targetContract.creation.blockNumber}
    currentValue={fetchedBlockNumber ?? targetContract.creation.blockNumber}
    goalValue={latestBlockNumber}
    detailsPosition={"bottom"}
    circleSize={changeSize(itemSize, 1)}
    {detailsTextSize}
    syncStateTextLabelProps={{
      showIcon: true,
      syncStateText: syncStateText,
      size: itemSize,
      colorCategoryFront: colorSettings.itemMemberText,
    }}
  />
</CommonItemMember>
