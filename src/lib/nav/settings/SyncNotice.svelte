<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { ChainName } from "@constants/chains/types";
  import type { SyncStateText } from "@db/dbTypes";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import { getSyncNoticeText } from "./syncNotice";

  let targetChainName: ChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
  let syncStateText: SyncStateText = $derived(
    $storeSyncStatus[targetChainName].syncStateText,
  );
  let text: string | undefined = $derived(getSyncNoticeText(syncStateText));
</script>

<!-- Always there, so that a screen reader reads the change. Without a
text it has no box, so that the grid adds no gap for it. With a text, it
wraps at the width of the other groups instead of widening the dialog.
While stopping it pulses, as the other "stopping" texts do, so that the user
sees that something goes on. "Syncing." waits for the user: no pulse. -->
<div
  role="status"
  class={text
    ? classNames("col-span-full", "w-0", "min-w-full", "px-1")
    : "contents"}
>
  {#if text}
    <BaseLabel
      {text}
      textSize={sizeSettings.navSettings}
      colorCategoryFront={colorSettings.navSettings}
      truncate={false}
      appendClass={syncStateText === "stopping"
        ? "motion-safe:animate-pulse"
        : undefined}
    />
  {/if}
</div>
