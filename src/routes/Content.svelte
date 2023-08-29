<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import BaseSnackbar from "$lib/base/BaseSnackbar.svelte";
  import Breadcrumb from "$lib/breadcrumb/Breadcrumb.svelte";
  import Nav from "$lib/nav/Nav.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<Nav />
<div class={classNames("flex-auto", "min-h-0")}>
  <div
    class={classNames(
      "flex",
      "flex-col",
      "h-full",
      "w-full",
      "px-3",
      "pb-1.5",
      colorDefinitions[themeColor][colorSettings.main].bg,
      ""
    )}
  >
    <Breadcrumb />
    <slot />
    <BaseSnackbar />
  </div>
</div>
