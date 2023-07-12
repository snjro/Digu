<script lang="ts">
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import { toggleIsSyncTarget } from "./toggleSyncTarget";
  import type {
    SyncStatusChain,
    SyncStatusContract,
    SyncStatusProject,
    SyncStatusVersion,
  } from "@db/dbTypes";
  import BaseCheckbox from "$lib/base/BaseCheckbox.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import classNames from "classnames";

  export let targetChain: Chain;
  export let targetProject: Project | undefined = undefined;
  export let targetVersion: Version | undefined = undefined;
  export let targetContract: Contract | undefined = undefined;
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

  const checkChanged = async () => {
    await toggleIsSyncTarget(
      targetChain.name,
      targetProject?.name,
      targetVersion?.name,
      targetContract?.name
    );
  };
  let indeterminate: () => boolean;
  $: indeterminate = (): boolean => {
    if (targetSyncStatus.subSyncStatuses) {
      let targetSubSyncStatusValues: (
        | SyncStatusProject
        | SyncStatusVersion
        | SyncStatusContract
      )[] = Object.values(targetSyncStatus.subSyncStatuses);
      const isAllSubSyncStatusValuesSame: boolean =
        targetSubSyncStatusValues.every(
          (
            targetSubSyncStatusValue:
              | SyncStatusProject
              | SyncStatusVersion
              | SyncStatusContract
          ) => {
            return (
              targetSubSyncStatusValue.isSyncTarget ===
              targetSubSyncStatusValues[0].isSyncTarget
            );
          }
        );
      return !isAllSubSyncStatusValuesSame;
    } else {
      return false;
    }
  };
  let labelText: () => string;
  $: labelText = () => {
    if (targetSyncStatus.subSyncStatuses) {
      if (indeterminate()) {
        return "Partially";
      } else {
        return targetSyncStatus.isSyncTarget ? "All" : "Nothing";
      }
    } else {
      return targetSyncStatus.isSyncTarget ? "Yes" : "No";
    }
  };
</script>

<div
  class={classNames("flex", "flex-row", "w-fit", "space-x-2", "items-center")}
>
  <BaseCheckbox
    checked={targetSyncStatus.isSyncTarget}
    indeterminate={indeterminate()}
    {size}
    disabled={syncStatus(targetChain).isSyncing}
    on:click={checkChanged}
  />
  <BaseLabel textSize={changeSize(size, 1)} text={labelText()} />
</div>
