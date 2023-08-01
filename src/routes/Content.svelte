<script lang="ts">
  import Nav from "$lib/nav/Nav.svelte";
  import classNames from "classnames";
  import Breadcrumb from "$lib/breadcrumb/Breadcrumb.svelte";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import BaseSnackbar from "$lib/base/BaseSnackbar.svelte";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { scrollbarStyle } from "$lib/appearanceConfig/scrollbar/scrollbarSetting";

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  $: contentStyle = classNames(
    "overflow-y-auto",
    scrollbarStyle(colorSettings.main).thick,
    "flex-1",
    "flex-col",
    "h-full",
    "w-full",
    "border-none",
    "px-3 pb-3 ",
    colorDefinitions[themeColor][colorSettings.main].bg,
    ""
  );
</script>

<Nav />
<div class={contentStyle}>
  <Breadcrumb />
  <slot />
  <BaseSnackbar />
</div>
