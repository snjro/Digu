<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import type { BaseSize } from "../baseSizes";
  interface Props {
    size: BaseSize;
    colorCategoryFront: ColorCategory;
    colorCategoryBg: ColorCategory;
    progressRate?: number;
    isDynamicPointer?: boolean;
  }

  let {
    size,
    colorCategoryFront,
    colorCategoryBg,
    progressRate = 100,
    isDynamicPointer = false,
  }: Props = $props();

  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

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
    "",
  )}
  style:width="{progressRate}%"
></div>
