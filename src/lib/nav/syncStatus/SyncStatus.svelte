<script lang="ts">
  import classNames from "classnames";
  import SyncStatusProgress from "./SyncStatusProgress.svelte";
  import SyncStatusToggle from "./SyncStatusToggle.svelte";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { breakPointWidthThresholds, breakPointWidths } from "@utils/utilsDom";
  import { storeUserSettings } from "@stores/storeUserSettings";

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
    "space-x-3"
  )}
>
  <SyncStatusToggle />
  <SyncStatusProgress hideProgressCircle={hideProgressCircle()} />
</div>
