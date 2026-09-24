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

  interface Props {
    progressRate: number;
    size: BaseSize;
    colorCategoryFront: ColorCategory;
    colorCategoryBg: ColorCategory;
    isColoredBar: boolean;
    showLabel: boolean;
    shadow?: boolean;
  }

  let {
    progressRate,
    size,
    colorCategoryFront,
    colorCategoryBg,
    isColoredBar,
    showLabel,
    shadow = true,
  }: Props = $props();

  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  let barWidth = $derived(isColoredBar ? progressRate : 100 - progressRate);
  let roundedStyle = $derived((): `rounded${string}` => {
    if (isColoredBar) {
      if (progressRate <= 1) {
        return "rounded-none";
      } else if (progressRate >= 99) {
        return "rounded-sm";
      } else {
        return "rounded-l-sm";
      }
    } else {
      if (progressRate <= 1) {
        return "rounded-sm";
      } else if (progressRate >= 99) {
        return "rounded-none";
      } else {
        return "rounded-r-sm";
      }
    }
  });
  let shadowStyle = $derived((): `shadow-${string}` => {
    if (!isColoredBar && shadow && themeColor !== "dark") {
      return `shadow-inner ${colorDefinitions[themeColor][colorCategoryFront].shadow}`;
    } else {
      return "shadow-none";
    }
  });
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
