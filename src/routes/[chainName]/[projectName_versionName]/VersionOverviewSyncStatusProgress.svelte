<script lang="ts">
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseProgressCircle from "#lib/base/BaseProgressCircle/BaseProgressCircle.svelte";
  import { changeSize } from "#lib/base/baseSizes.js";
  import {
    getSummedProgressRange,
    type ProgressRange,
  } from "#lib/base/BaseProgressBarForBlockNumber/syncStatusProgress.js";
  import CommonItemMember from "#lib/common/CommonItemMember.svelte";
  import type { Chain, Project, Version } from "#constants/chains/types.js";
  import type { SyncStateText, SyncStatusVersion } from "#db/dbTypes.js";
  import { storeChainStatus } from "#stores/storeChainStatus.js";
  import { storeSyncStatus } from "#stores/storeSyncStatus.js";

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

  let range: ProgressRange = $derived(
    getSummedProgressRange(
      targetVersionSyncStatus,
      $storeChainStatus[targetChain.name].latestBlockNumber,
    ),
  );

  let syncStateText: SyncStateText = $derived(
    targetVersionSyncStatus.syncStateText,
  );
</script>

<CommonItemMember text="Progress">
  <BaseProgressCircle
    startValue={range.start}
    currentValue={range.current}
    goalValue={range.goal}
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
