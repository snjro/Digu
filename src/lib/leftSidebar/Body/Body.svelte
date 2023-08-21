<script lang="ts">
  import classNames from "classnames";
  import ItemHome from "./ItemHome.svelte";
  import ItemProjectVersions from "./ItemProjectVersions.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import {
    getScrollbarStyle,
    type ScrollbarStyle,
  } from "$lib/appearanceConfig/scrollbar/scrollbarSetting";

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
  let scrollbarStyle: ScrollbarStyle;
  $: scrollbarStyle = getScrollbarStyle(
    colorSettings.leftSidebarBodyBg,
    themeColor
  );
</script>

<div
  id="leftSidebarBody"
  class={classNames(
    "min-h-0",
    "w-full",
    "flex",
    "flex-col",
    "flex-grow",
    "right-padding",
    "h-full",
    colorDefinitions[themeColor][colorSettings.leftSidebarBodyBg].bg,

    ""
  )}
>
  <div
    class={classNames(
      "py-1",
      "h-full",
      "w-full",
      "flex",
      "flex-col",
      "flex-grow",
      "right-padding",
      colorDefinitions[themeColor][colorSettings.leftSidebarBodyBg].bg,
      "overflow-y-scroll",
      "overflow-x-hidden",
      scrollbarStyle.thin,
      ""
    )}
  >
    <ItemHome />
    <ItemProjectVersions />
  </div>
</div>

<style lang="scss">
  @use "../leftsidebar.scss" as lsb;
  .right-padding {
    padding-right: lsb.$padding-right * 1px;
  }
</style>
