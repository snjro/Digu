<script lang="ts">
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseButton from "#lib/base/BaseButton.svelte";
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import {
    selectWarpSyncState,
    stopWarpSync,
    storeWarpSync,
    type WarpSyncState,
  } from "@warpSync/warpSyncState";
  import { getImportProgressText } from "@warpSync/warpSyncTexts";
  import classNames from "classnames";

  let chainName: string = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
  let warpState: WarpSyncState = $derived(
    selectWarpSyncState($storeWarpSync, chainName),
  );
  let isImporting: boolean = $derived(warpState.status === "importing");
  // The time left moves on between the ranges too.
  let now: number = $state(Date.now());
  $effect(() => {
    if (!isImporting) return;
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });
  let text: string = $derived(getImportProgressText(warpState, now));
</script>

{#if isImporting}
  <div class={classNames("flex", "flex-row", "items-center", "space-x-1")}>
    <BaseLabel
      {text}
      textSize={sizeSettings.navInputHelperText}
      appendClass="motion-safe:animate-pulse"
    />
    <!-- Only for a large import, which takes minutes. -->
    {#if warpState.progress}
      <BaseButton
        label="Stop"
        size={sizeSettings.navInputHelperText}
        colorCategoryFront="white"
        colorCategoryBg="error"
        onclick={() => stopWarpSync(chainName)}
      />
    {/if}
  </div>
{/if}
