<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import { getProgressRateForLabel } from "./progressRate";

  export let progressRate: number;
  export let size: BaseSize;
  export let colorCategoryFront: ColorCategory;
  export let colorCategoryBg: ColorCategory;
  export let isColoredBar: boolean;
  export let showLabel: boolean;
  export let shadow: boolean = true;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;

  $: barWidth = isColoredBar ? progressRate : 100 - progressRate;
  $: roundedStyle = (): `rounded${string}` => {
    if (isColoredBar) {
      if (progressRate <= 1) {
        return "rounded-none";
      } else if (progressRate >= 99) {
        return "rounded";
      } else {
        return "rounded-l";
      }
    } else {
      if (progressRate <= 1) {
        return "rounded";
      } else if (progressRate >= 99) {
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
    "bg-transparent",
    "items-center",
    isColoredBar ? "justify-end" : "justify-start",
    "h-full",
    roundedStyle(),
    shadowStyle(),
    "",
  )}
  style:width="{barWidth}%"
>
  {#if showLabel}
    <BaseLabel
      text={`${getProgressRateForLabel(progressRate)}%`}
      textSize={size}
      {colorCategoryFront}
      {colorCategoryBg}
      appendClass={classNames(roundedStyle(), "px-0.5")}
    />
  {/if}
</div>
