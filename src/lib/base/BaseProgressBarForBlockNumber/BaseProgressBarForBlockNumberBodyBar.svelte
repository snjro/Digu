<script lang="ts">
  import classNames from "classnames";
  import type { BaseSize } from "$lib/base/baseSizes";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";

  export let progressRate: number;
  export let size: BaseSize;
  export let colorCategoryFront: ColorCategory;
  export let colorCategoryBg: ColorCategory;
  export let isColoredBar: boolean;
  export let showLabel: boolean;
  export let shadow: boolean = true;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  $: barWidth = isColoredBar ? progressRate : 100 - progressRate;
  $: roundedStyle = (): `rounded${string}` => {
    if (isColoredBar) {
      if (progressRate <= 0) {
        return "rounded-none";
      } else if (progressRate >= 100) {
        return "rounded";
      } else {
        return "rounded-l";
      }
    } else {
      if (progressRate <= 0) {
        return "rounded";
      } else if (progressRate >= 100) {
        return "rounded-none";
      } else {
        return "rounded-r";
      }
    }
  };
  $: shadowStyle = (): `shadow-${string}` => {
    if (!isColoredBar && shadow && themeColor !== "dark") {
      return `shadow-inner ${colorDefinitions[themeColor][colorCategoryFront].shadow}`;
    } else {
      return "shadow-none";
    }
  };
</script>

<div
  class={classNames(
    "flex",
    showLabel && "pr-1",
    "bg-transparent",
    "items-center",
    isColoredBar ? "justify-end" : "justify-start",
    "h-full",
    roundedStyle(),
    shadowStyle(),
    ""
  )}
  style:width="{barWidth}%"
>
  {#if showLabel}
    <BaseLabel
      text={`${progressRate.toFixed(1)}%`}
      textSize={size}
      {colorCategoryFront}
      {colorCategoryBg}
    />
  {/if}
</div>
