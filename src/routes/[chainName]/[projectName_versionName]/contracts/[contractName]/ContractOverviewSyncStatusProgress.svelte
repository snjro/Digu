<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { breakPointWidths } from "$lib/appearanceConfig/size/sizeDefinitions";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
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
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { NO_DATA } from "@utils/utilsConstants";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
    targetContract: Contract;
  }

  let { targetChain, targetProject, targetVersion, targetContract }: Props =
    $props();

  const itemSize: BaseSize = sizeSettings.itemMember;
  let targetContractSyncStatus: SyncStatusContract | undefined = $derived(
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name],
  );

  let latestBlockNumber: number = $derived(
    $storeChainStatus[targetChain.name].latestBlockNumber,
  );

  let fetchedBlockNumber: number | undefined = $derived(
    targetContractSyncStatus
      ? targetContractSyncStatus.fetchedBlockNumber
      : undefined,
  );

  let detailsTextSize: BaseSize = $derived(
    $storeNoDbCurrentWidth <= breakPointWidths.md
      ? changeSize(itemSize, -1)
      : itemSize,
  );

  let syncStateText: SyncStateText = $derived(
    targetContractSyncStatus?.syncStateText ?? NO_DATA,
  );
</script>

<CommonItemMember text="Progress">
  <BaseProgressCircle
    startValue={targetContract.creation.blockNumber}
    currentValue={fetchedBlockNumber ?? targetContract.creation.blockNumber}
    goalValue={latestBlockNumber}
    detailsPosition="bottom"
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
