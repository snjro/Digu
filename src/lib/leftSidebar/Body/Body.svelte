<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import {
    getScrollbarStyle,
    type ScrollbarStyle,
  } from "$lib/appearanceConfig/scrollbar/scrollbarSetting";
  import classNames from "classnames";
  import ItemHome from "./ItemHome.svelte";
  import ItemProjectVersions from "./ItemProjectVersions.svelte";

  let scrollbarStyle: ScrollbarStyle = $derived(
    getScrollbarStyle(colorSettings.leftSidebarBodyBg),
  );
</script>

<div
  id="leftSidebarBody"
  class={classNames(
    "min-h-0",
    "flex-auto",
    "w-full",
    colorClasses[colorSettings.leftSidebarBodyBg].bg,
    "overflow-y-scroll",
    scrollbarStyle.thin,
    "",
  )}
>
  <div
    class={classNames(
      "py-1",
      "pr-1",
      "h-fit",
      "w-full",
      "flex",
      "flex-col",
      "",
    )}
  >
    <ItemHome />
    <ItemProjectVersions />
  </div>
</div>
