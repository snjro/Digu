<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { selectWarpSyncState, storeWarpSync } from "@warpSync/warpSyncState";

  let isImporting: boolean = $derived(
    selectWarpSyncState(
      $storeWarpSync,
      $storeUserSettings.selectedChainName.toString(),
    ).status === "importing",
  );
</script>

{#if isImporting}
  <BaseLabel
    text="Importing logs"
    textSize={sizeSettings.navInputHelperText}
    appendClass="animate-pulse"
  />
{/if}
