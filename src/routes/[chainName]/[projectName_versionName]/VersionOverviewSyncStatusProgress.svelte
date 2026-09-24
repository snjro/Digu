<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseProgressCircle from "$lib/base/BaseProgressCircle/BaseProgressCircle.svelte";
  import { changeSize } from "$lib/base/baseSizes";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import type { Chain, Project, Version } from "@constants/chains/types";
  import type { SyncStateText, SyncStatusVersion } from "@db/dbTypes";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeSyncStatus } from "@stores/storeSyncStatus";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
  }

  let { targetChain, targetProject, targetVersion }: Props = $props();

  let targetVersionSyncStatus: SyncStatusVersion = $derived(
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name],
  );

  let latestBlockNumber: number = $derived(
    $storeChainStatus[targetChain.name].latestBlockNumber,
  );

  let fetchedBlockNumber: number = $derived(
    targetVersionSyncStatus.fetchedBlockNumber,
  );

  let syncStateText: SyncStateText = $derived(
    targetVersionSyncStatus.syncStateText,
  );
</script>

<CommonItemMember text="Progress">
  <BaseProgressCircle
    startValue={targetVersionSyncStatus.creationBlockNumber}
    currentValue={fetchedBlockNumber}
    goalValue={latestBlockNumber *
      targetVersionSyncStatus.numOfSyncTargetContract}
    detailsPosition="none"
    circleSize={changeSize(sizeSettings.itemMember, 1)}
    syncStateTextLabelProps={{
      showIcon: true,
      syncStateText: syncStateText,
      size: sizeSettings.itemMember,
      colorCategoryFront: colorSettings.itemMemberText,
    }}
  />
</CommonItemMember>
