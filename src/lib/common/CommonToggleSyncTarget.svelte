<script lang="ts" context="module">
  const isSyncTargetIndeterminate = (
    subSyncStatuses: SubSyncStatuses,
  ): boolean => {
    if (subSyncStatuses) {
      let targetSubSyncStatusValues: SubSyncStatus[] =
        Object.values(subSyncStatuses);
      const isAllSubSyncStatusValuesSame: boolean =
        targetSubSyncStatusValues.every(
          (targetSubSyncStatusValue: SubSyncStatus) => {
            return (
              targetSubSyncStatusValue.isSyncTarget ===
              targetSubSyncStatusValues[0].isSyncTarget
            );
          },
        );
      return !isAllSubSyncStatusValuesSame;
    } else {
      return false;
    }
  };

  export type SyncTargetLabelText =
    | "Partially"
    | "All"
    | "Nothing"
    | "Yes"
    | "No";
  export const syncTargetLabelText = (
    targetSyncStatus: SyncStatus,
  ): SyncTargetLabelText => {
    if (targetSyncStatus.subSyncStatuses) {
      if (isSyncTargetIndeterminate(targetSyncStatus.subSyncStatuses)) {
        return "Partially";
      } else {
        return targetSyncStatus.isSyncTarget ? "All" : "Nothing";
      }
    } else {
      return targetSyncStatus.isSyncTarget ? "Yes" : "No";
    }
  };
</script>

<script lang="ts">
  import BaseCheckbox from "$lib/base/BaseCheckbox.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import type { SubSyncStatus, SubSyncStatuses, SyncStatus } from "@db/dbTypes";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import classNames from "classnames";
  import { toggleIsSyncTarget } from "./toggleSyncTarget";

  export let targetChain: Chain;
  export let targetProject: Project | undefined = undefined;
  export let targetVersion: Version | undefined = undefined;
  export let targetContract: Contract | undefined = undefined;
  export let size: BaseSize;

  $: syncStatus = <
    CH extends Chain,
    PR extends Project | undefined = undefined,
    VE extends Version | undefined = undefined,
    CO extends Contract | undefined = undefined,
  >(
    targetChain: CH,
    targetProject?: PR,
    targetVersion?: PR extends Project ? VE : undefined,
    targetContract?: VE extends Version ? CO : undefined,
  ): SyncStatus => {
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
  let targetSyncStatus: SyncStatus;
  $: targetSyncStatus = syncStatus(
    targetChain,
    targetProject,
    targetVersion,
    targetContract,
  );

  const checkChanged = async () => {
    await toggleIsSyncTarget(
      targetChain.name,
      targetProject?.name,
      targetVersion?.name,
      targetContract?.name,
    );
  };
</script>

<div
  class={classNames("flex", "flex-row", "w-fit", "space-x-2", "items-center")}
>
  <BaseCheckbox
    checked={targetSyncStatus.isSyncTarget}
    indeterminate={isSyncTargetIndeterminate(targetSyncStatus.subSyncStatuses)}
    {size}
    disabled={syncStatus(targetChain).isSyncing}
    on:click={checkChanged}
  />
  <BaseLabel
    textSize={changeSize(size, 1)}
    text={syncTargetLabelText(targetSyncStatus)}
  />
</div>
