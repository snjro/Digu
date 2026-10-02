<script lang="ts">
  import {
    breakPointWidthThresholds,
    breakPointWidths,
  } from "#lib/appearanceConfig/size/sizeDefinitions.js";
  import { storeNoDbCurrentWidth } from "#stores/storeNoDb.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import classNames from "classnames";
  import SyncStatusProgress from "./SyncStatusProgress.svelte";
  import SyncStatusToggle from "./SyncStatusToggle.svelte";
  import WarpSyncStatus from "./WarpSyncStatus.svelte";

  interface Props {
    isSyncPanelOpen: boolean;
    syncPanelButton?: HTMLButtonElement | undefined;
  }

  let { isSyncPanelOpen = $bindable(), syncPanelButton = $bindable() }: Props =
    $props();

  let hideProgressCircle = $derived((): boolean => {
    if ($storeNoDbCurrentWidth <= breakPointWidths.sm) return true;
    if (
      $storeNoDbCurrentWidth <=
        breakPointWidthThresholds.navSyncStatusForOpenedSidebar &&
      $storeUserSettings.isOpenSidebar
    )
      return true;

    return false;
  });
</script>

<div
  class={classNames(
    "flex",
    hideProgressCircle() ? "flex-col" : "flex-row",
    "w-fit",
    "h-full",
    "items-center",
    "justify-center",
    "space-x-0.5",
  )}
>
  <SyncStatusToggle />
  <SyncStatusProgress
    hideProgressCircle={hideProgressCircle()}
    bind:isSyncPanelOpen
    bind:syncPanelButton
  />
  <WarpSyncStatus />
</div>
