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

  export let gridCols: 2 | 6 | undefined = undefined;
  export let hidden: boolean = false;

  const gridMain: string | undefined = gridCols
    ? classNames(
        "grid",
        gridCols === 2 ? "grid-cols-2" : "grid-cols-6",
        "grid-flow-dense",
        "gap-3"
      )
    : undefined;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
  let scrollbarStyle: ScrollbarStyle;
  $: scrollbarStyle = getScrollbarStyle(colorSettings.tabSelected, themeColor);

  let scrollStyle: string;
  $: scrollStyle = classNames(
    colorDefinitions[themeColor][colorSettings.tabSelected].bg,
    "overflow-y-scroll",
    scrollbarStyle.thin
  );
</script>

<div
  class={classNames(
    "w-full",
    "h-full",
    "pr-0.5",
    hidden && "hidden",
    "min-h-0",
    ""
  )}
>
  <div
    class={classNames(gridMain, "w-full", "h-full", "pr-0.5", scrollStyle, "")}
  >
    <slot />
  </div>
</div>
