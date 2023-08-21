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

  export let hasTab: boolean = false;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
  let scrollbarStyle: ScrollbarStyle;
  $: scrollbarStyle = getScrollbarStyle(colorSettings.tabSelected, themeColor);
</script>

<div
  class={classNames(
    "min-h-0",
    "h-full",
    "w-full",
    "py-3",
    "pl-3",
    "pr-1",
    "rounded-tr",
    "rounded-b",
    !hasTab && "rounded-tl",
    colorDefinitions[themeColor][colorSettings.tabSelected].bg,
    ""
  )}
>
  <div
    class={classNames(
      "min-h-0",
      "h-full",
      "w-full",
      "pr-1",
      colorDefinitions[themeColor][colorSettings.tabSelected].bg,
      "overflow-y-scroll",
      scrollbarStyle.thin,
      ""
    )}
  >
    <slot />
  </div>
</div>
