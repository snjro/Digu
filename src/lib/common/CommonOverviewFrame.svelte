<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import {
    getScrollbarStyle,
    type ScrollbarStyle,
  } from "$lib/appearanceConfig/scrollbar/scrollbarSetting";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";

  export let gridCols: 1 | 2 | 6 | undefined = undefined;
  export let hidden: boolean = false;

  const targetGridCols = (): `grid-cols-${number}` | undefined => {
    switch (gridCols) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-2";
      case 6:
        return "grid-cols-6";
      default:
        return undefined;
    }
  };
  const gridMain: string | undefined = gridCols
    ? classNames("grid", targetGridCols(), "grid-flow-dense", "gap-1.5")
    : undefined;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
  let scrollbarStyle: ScrollbarStyle;
  $: scrollbarStyle = getScrollbarStyle(colorSettings.tabSelected, themeColor);

  let scrollStyle: string;
  $: scrollStyle = classNames(
    colorDefinitions[themeColor][colorSettings.tabSelected].bg,
    "overflow-y-scroll",
    scrollbarStyle.thin,
  );
</script>

<div
  class={classNames(
    // "flex-auto",
    // "min-h-0",
    "h-full",
    hidden && "hidden",
    scrollStyle,
  )}
>
  <div class={classNames(gridMain, "w-full", "h-full", "")}>
    <slot />
  </div>
</div>
