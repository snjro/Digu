<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { ChainName } from "@constants/chains/types";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import { getSyncNoticeText } from "./syncNotice";

  let targetChainName: ChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
  let text: string | undefined = $derived(
    getSyncNoticeText($storeSyncStatus[targetChainName].syncStateText),
  );
</script>

<!-- Always there, so that a screen reader reads the change. Without a
text it has no box, so that the grid adds no gap for it. With a text, it
wraps at the width of the other groups instead of widening the dialog. -->
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
    />
  {/if}
</div>
