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
  import type { SyncStatus } from "@db/dbTypes";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { NO_DATA } from "@utils/utilsConstants";
  import classNames from "classnames";
  import { getProjectVersionNameForLabel } from "./projectVersionNameHelper";
  import {
    getTargetSyncStatus,
    isSyncTargetIndeterminate,
    syncTargetLabelText,
  } from "./syncTargetStatus";
  import { toggleIsSyncTarget } from "./toggleSyncTarget";

  interface Props {
    targetChain: Chain;
    targetProject?: Project | undefined;
    targetVersion?: Version | undefined;
    targetContract?: Contract | undefined;
    size: BaseSize;
  }

  let {
    targetChain,
    targetProject = undefined,
    targetVersion = undefined,
    targetContract = undefined,
    size,
  }: Props = $props();

  let targetSyncStatus: SyncStatus | undefined = $derived(
    getTargetSyncStatus(
      $storeSyncStatus,
      targetChain,
      targetProject,
      targetVersion,
      targetContract,
    ),
  );

  let targetName: string = $derived.by(() => {
    if (targetContract) return targetContract.name;
    if (targetVersion) {
      return targetProject
        ? getProjectVersionNameForLabel(targetProject.name, targetVersion.name)
        : targetVersion.name;
    }
    if (targetProject) return targetProject.name;
    return targetChain.name;
  });

  const checkChanged = async () => {
    await toggleIsSyncTarget(
      targetChain.name,
      targetProject?.name,
      targetVersion?.name,
      targetContract?.name,
    );
  };
</script>

{#if targetSyncStatus}
  <div
    class={classNames("flex", "flex-row", "w-fit", "space-x-2", "items-center")}
  >
    <BaseCheckbox
      checked={targetSyncStatus.isSyncTarget}
      indeterminate={isSyncTargetIndeterminate(
        targetSyncStatus.subSyncStatuses,
      )}
      {size}
      disabled={getTargetSyncStatus($storeSyncStatus, targetChain)?.isSyncing}
      onclick={checkChanged}
      ariaLabel={`Sync target: ${targetName}`}
    />
    <BaseLabel
      textSize={changeSize(size, 1)}
      text={syncTargetLabelText(targetSyncStatus)}
    />
  </div>
{:else}
  <BaseLabel textSize={changeSize(size, 1)} text={NO_DATA} />
{/if}
