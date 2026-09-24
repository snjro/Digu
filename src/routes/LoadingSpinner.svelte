<script lang="ts">
  import { afterNavigate, beforeNavigate } from "$app/navigation";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { zIndex } from "$lib/appearanceConfig/zIndex";
  import BaseSpinner from "$lib/base/BaseSpinner.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeNodbShowLoader } from "@stores/storeNoDb";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";

  let showLoader: boolean = $state(false);
  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  beforeNavigate(() => {
    showLoader = true;
  });

  afterNavigate(() => {
    showLoader = false;
  });
</script>

{#if showLoader || $storeNodbShowLoader}
  <div
    data-testid="loadingSpinner-test"
    class={classNames(
      "fixed",
      "flex items-center justify-center",
      "h-screen w-screen",
      zIndex.loadingSpinner,
      "",
    )}
  >
    <div
      class={classNames(
        "absolute inset-0",
        colorDefinitions[themeColor][colorSettings.main].bg,
        "opacity-60",
      )}
    ></div>
    <div class="relative">
      <BaseSpinner size="5xl" trackColor={colorSettings.sub} />
    </div>
  </div>
{/if}
