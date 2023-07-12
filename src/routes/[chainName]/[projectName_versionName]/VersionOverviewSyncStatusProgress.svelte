<script lang="ts">
  import BaseProgressCircle from "$lib/base/BaseProgressCircle/BaseProgressCircle.svelte";
  import { changeSize } from "$lib/base/baseSizes";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import type { Chain, Project, Version } from "@constants/chains/types";
  import type { SyncStatusVersion } from "@db/dbTypes";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeSyncStatus } from "@stores/storeSyncStatus";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;

  let targetVersionSyncStatus: SyncStatusVersion;
  $: targetVersionSyncStatus =
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name];

  let latestBlockNumber: number;
  $: latestBlockNumber = $storeChainStatus[targetChain.name].latestBlockNumber;
  let fetchedBlockNumber: number;
  $: fetchedBlockNumber = targetVersionSyncStatus.fetchedBlockNumber;
</script>

<CommonItemMember text="Progress">
  <BaseProgressCircle
    startValue={targetVersionSyncStatus.creationBlockNumber}
    currentValue={fetchedBlockNumber}
    goalValue={latestBlockNumber *
      targetVersionSyncStatus.numOfSyncTargetContract}
    detailsPosition="none"
    circleSize={changeSize(sizeSettings.itemMember, 1)}
  />
</CommonItemMember>
