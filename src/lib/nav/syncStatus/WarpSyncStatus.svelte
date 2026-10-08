<script lang="ts">
  import type { Chain } from "#constants/chains/types.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseButton from "#lib/base/BaseButton.svelte";
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import { storeRpcSettings } from "#stores/storeRpcSettings.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import { getTargetChain } from "#utils/utilsDb.js";
  import { retryWarpSync } from "#warpSync/warpSync.js";
  import {
    selectWarpSyncState,
    stopWarpSync,
    storeWarpSync,
    type WarpSyncState,
  } from "#warpSync/warpSyncState.js";
  import {
    getImportProgressText,
    IMPORT_FAILED,
    IMPORT_FAILED_BUSY,
  } from "#warpSync/warpSyncTexts.js";
  import classNames from "classnames";

  let chainName: string = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
  let targetChain: Chain = $derived(getTargetChain({ chainName }));
  let warpState: WarpSyncState = $derived(
    selectWarpSyncState($storeWarpSync, chainName),
  );
  let isImporting: boolean = $derived(warpState.status === "importing");
  // Only while the warp sync is on, as Import in the settings.
  let hasFailed: boolean = $derived(
    warpState.status === "failed" && $storeRpcSettings[chainName].warpSync,
  );
  // The texts while stopping or finishing do not read now, and the progress
  // after a failure stays as it was (its time left would only grow).
  let isEnding: boolean = $derived(warpState.ending !== undefined);
  // The time left moves on between the ranges too.
  let now: number = $state(Date.now());
  $effect(() => {
    if (!isImporting || isEnding) return;
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });
  let text: string = $derived(
    hasFailed
      ? warpState.busy
        ? IMPORT_FAILED_BUSY
        : IMPORT_FAILED
      : getImportProgressText(warpState, now),
  );
</script>

{#if isImporting || hasFailed}
  <div class={classNames("flex", "flex-row", "items-center", "space-x-1")}>
    <BaseLabel
      {text}
      textSize={sizeSettings.navInputHelperText}
      appendClass={isImporting ? "motion-safe:animate-pulse" : undefined}
    />
    {#if hasFailed}
      <BaseButton
        label="Retry"
        size={sizeSettings.navInputHelperText}
        colorCategoryFront="white"
        colorCategoryBg="interactive"
        onclick={() => void retryWarpSync(targetChain)}
      />
    {:else if warpState.progress && !warpState.ending}
      <!-- Only for a large import, which takes minutes. -->
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
