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
  import { storeNoDbSnackBar } from "@stores/storeNoDb";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { customLogger } from "@utils/logger";
  import { NO_DATA } from "@utils/utilsConstants";
  import classNames from "classnames";
  import { getProjectVersionNameForLabel } from "./projectVersionNameHelper";
  import { showSnackBarAsSaveFailed } from "./saveFailed";
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

  // Bound to the box, because a click changes it before the write. After a
  // failed write the store does not change, so set the saved values again.
  let checked: boolean = $state(false);
  let indeterminate: boolean = $state(false);
  function showSavedValues(): void {
    if (!targetSyncStatus) return;
    checked = targetSyncStatus.isSyncTarget;
    indeterminate = isSyncTargetIndeterminate(targetSyncStatus.subSyncStatuses);
  }
  $effect.pre(showSavedValues);

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
    try {
      await toggleIsSyncTarget(
        targetChain.name,
        targetProject?.name,
        targetVersion?.name,
        targetContract?.name,
      );
    } catch (error) {
      customLogger.error("Toggle the sync target.", error);
      $storeNoDbSnackBar = showSnackBarAsSaveFailed;
      showSavedValues();
    }
  };
</script>

{#if targetSyncStatus}
  <div
    class={classNames("flex", "flex-row", "w-fit", "space-x-2", "items-center")}
  >
    <BaseCheckbox
      bind:checked
      bind:indeterminate
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
