<script lang="ts">
  import classNames from "classnames";
  import ItemHome from "./ItemHome.svelte";
  import ItemProjectVersions from "./ItemProjectVersions.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { scrollbarStyle } from "$lib/appearanceConfig/scrollbar/scrollbarSetting";

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<div
  id="leftSidebarBody"
  class={classNames(
    "w-full",
    "flex",
    "flex-col",
    "flex-grow",
    "pt-2",
    "right-padding",
    colorDefinitions[themeColor][colorSettings.leftSidebarBodyBg].bg,
    "overflow-y-scroll",
    "overflow-x-hidden",
    scrollbarStyle(colorSettings.leftSidebarBodyBg).thick,
    "h-full",
    ""
  )}
>
  <ItemHome />
  <ItemProjectVersions />
</div>

<style lang="scss">
  @use "../leftsidebar.scss" as lsb;
  .right-padding {
    padding-right: lsb.$padding-right * 1px;
  }
</style>
