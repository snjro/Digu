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
  import classNames from "classnames";
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

  let targetSyncStatus: SyncStatus = $derived(
    getTargetSyncStatus(
      $storeSyncStatus,
      targetChain,
      targetProject,
      targetVersion,
      targetContract,
    ),
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
    disabled={getTargetSyncStatus($storeSyncStatus, targetChain).isSyncing}
    onclick={checkChanged}
  />
  <BaseLabel
    textSize={changeSize(size, 1)}
    text={syncTargetLabelText(targetSyncStatus)}
  />
</div>
