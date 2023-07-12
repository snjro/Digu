<script lang="ts">
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import type {
    SyncStatusChain,
    SyncStatusContract,
    SyncStatusProject,
    SyncStatusVersion,
  } from "@db/dbTypes";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { NO_DATA } from "@utils/utilsCostants";

  export let targetChain: Chain;
  export let targetProject: Project | undefined = undefined;
  export let targetVersion: Version | undefined = undefined;
  export let targetContract: Contract | undefined = undefined;
  export let colorCategoryFront: ColorCategory;
  export let size: BaseSize;

  $: syncStatus = <
    CH extends Chain,
    PR extends Project | undefined = undefined,
    VE extends Version | undefined = undefined,
    CO extends Contract | undefined = undefined
  >(
    targetChain: CH,
    targetProject?: PR,
    targetVersion?: PR extends Project ? VE : undefined,
    targetContract?: VE extends Version ? CO : undefined
  ):
    | SyncStatusChain
    | SyncStatusProject
    | SyncStatusVersion
    | SyncStatusContract => {
    if (targetProject && targetVersion && targetContract) {
      return $storeSyncStatus[targetChain.name].subSyncStatuses[
        targetProject.name
      ].subSyncStatuses[targetVersion.name].subSyncStatuses[
        targetContract.name
      ];
    } else if (targetProject && targetVersion && !targetContract) {
      return $storeSyncStatus[targetChain.name].subSyncStatuses[
        targetProject.name
      ].subSyncStatuses[targetVersion.name];
    } else if (targetProject && !targetVersion && !targetContract) {
      return $storeSyncStatus[targetChain.name].subSyncStatuses[
        targetProject.name
      ];
    } else {
      return $storeSyncStatus[targetChain.name];
    }
  };
  let targetSyncStatus:
    | SyncStatusChain
    | SyncStatusProject
    | SyncStatusVersion
    | SyncStatusContract;
  $: targetSyncStatus = syncStatus(
    targetChain,
    targetProject,
    targetVersion,
    targetContract
  );

  let currentStateText: () => string;
  $: currentStateText = (): string => {
    let isSyncing: boolean = targetSyncStatus.isSyncing;
    let isAbort: boolean = targetSyncStatus.isAbort;

    if (isSyncing) {
      if (isAbort) {
        return "Stopping...";
      } else {
        return "Syncing...";
      }
    } else {
      if (isAbort) {
        return NO_DATA;
      } else {
        return "Stopped";
      }
    }
  };
</script>

<BaseLabel text={currentStateText()} {colorCategoryFront} textSize={size} />
