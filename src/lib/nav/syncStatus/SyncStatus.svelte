<script lang="ts">
  import classNames from "classnames";
  import SyncStatusProgress from "./SyncStatusProgress.svelte";
  import SyncStatusToggle from "./SyncStatusToggle.svelte";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import {
    breakPointWidthThresholds,
    breakPointWidths,
  } from "$lib/appearanceConfig/size/sizeDefinitions";

  $: hideProgressCircle = (): boolean => {
    if ($storeNoDbCurrentWidth <= breakPointWidths.sm) return true;
    if (
      $storeNoDbCurrentWidth <=
        breakPointWidthThresholds.navSyncStatusForOpenedSidebar &&
      $storeUserSettings.isOpenSidebar
    )
      return true;

    return false;
  };
</script>

<div
  class={classNames(
    "flex",
    hideProgressCircle() ? "flex-col" : "flex-row",
    "w-fit",
    "h-full",
    "items-center",
    "justify-center",
    "space-x-0.5"
  )}
>
  <SyncStatusToggle />
  <SyncStatusProgress hideProgressCircle={hideProgressCircle()} />
</div>
