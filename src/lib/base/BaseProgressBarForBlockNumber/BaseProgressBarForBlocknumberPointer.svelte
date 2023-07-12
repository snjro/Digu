<script lang="ts">
  import classNames from "classnames";
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import type { BaseSize } from "../baseSizes";
  export let size: BaseSize;
  export let colorCategoryFront: ColorCategory;
  export let colorCategoryBg: ColorCategory;
  export let progressRate: number = 100;
  export let isDynamicPointer: boolean = false;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  const pointerHeights: { [key in BaseSize]: string } = {
    xs: "h-1",
    sm: "h-2",
    md: "h-2",
    lg: "h-3",
    xl: "h-3",
    "2xl": "h-4",
    "3xl": "h-4",
    "4xl": "h-4",
    "5xl": "h-4",
  };
</script>

<div
  class={classNames(
    isDynamicPointer ? "border-r" : "border-x",
    isDynamicPointer ? "" : "w-full",
    "bg-transparent",
    pointerHeights[size],
    colorCategoryFront
      ? colorDefinitions[themeColor][colorCategoryBg].border
      : "border-inherit",
    ""
  )}
  style:width="{progressRate}%"
/>
