<script lang="ts" context="module">
  export type CurrentSyncingState =
    | "Stopped"
    | "Syncing..."
    | "Stopping..."
    | typeof NO_DATA;

  export function iconNameForCurrentSyncingState(
    currentSyncingState: CurrentSyncingState
  ): BaseIconProps["name"] {
    if (
      currentSyncingState === "Stopping..." ||
      currentSyncingState === "Syncing..."
    ) {
      return "sync";
    } else {
      return "pause";
    }
  }
  export function getCurrentSyncingState(
    targetSyncStatus: SyncStatus
  ): CurrentSyncingState {
    const isSyncing: boolean = targetSyncStatus.isSyncing;
    const isAbort: boolean = targetSyncStatus.isAbort;
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
  }
</script>

<script lang="ts">
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import type { SyncStatus } from "@db/dbTypes";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { NO_DATA } from "@utils/utilsCostants";
  import classNames from "classnames";

  export let targetChain: Chain;
  export let targetProject: Project | undefined = undefined;
  export let targetVersion: Version | undefined = undefined;
  export let targetContract: Contract | undefined = undefined;
  export let showIcon: boolean = true;
  export let colorCategoryFront: ColorCategory;
  export let size: BaseSize;
  export let currentSyncingState: CurrentSyncingState = NO_DATA;

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
    targetContract
  );
  $: currentSyncingState = getCurrentSyncingState(targetSyncStatus);

  let animatePulse: "animate-pulse" | undefined = undefined;
  $: animatePulse =
    currentSyncingState === "Stopping..." ? "animate-pulse" : undefined;
  let animateSpin: "animate-spin" | undefined = undefined;
  $: animateSpin =
    currentSyncingState === "Syncing..." ? "animate-spin" : undefined;

  let prefixIcon: BaseIconProps | undefined;
  $: prefixIcon = showIcon
    ? {
        name: iconNameForCurrentSyncingState(currentSyncingState),
        appendClass: classNames(animateSpin, animatePulse),
      }
    : undefined;
</script>

<BaseLabel
  text={currentSyncingState}
  {colorCategoryFront}
  textSize={size}
  {prefixIcon}
  appendClass={animatePulse}
/>
