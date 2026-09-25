<script lang="ts">
  import {
    colorClasses,
    colorVar,
    dotsImageVar,
  } from "$lib/appearanceConfig/color/colorVariables";
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import { baseTextHeight, type BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";

  // import BaseLabel from "./BaseLabel.svelte";
  import BaseProgressBarForBlockNumberBodyBar from "./BaseProgressBarForBlockNumberBodyBar.svelte";
  interface Props {
    processing: boolean;
    rounded: boolean;
    progressRate: number;
    size: BaseSize;
    colorCategoryFront: ColorCategory;
    colorCategoryBg: ColorCategory;
    colorCategoryProgress: ColorCategory;
    shadowBar?: boolean;
  }

  let {
    processing,
    rounded,
    progressRate,
    size,
    colorCategoryFront,
    colorCategoryBg,
    colorCategoryProgress,
    shadowBar = true,
  }: Props = $props();

  const barHeights: { [key in BaseSize]: string } = baseTextHeight;

  const roundedSizes: { [key in BaseSize]: string } = {
    xs: "rounded-xs",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    "3xl": "rounded-3xl",
    "4xl": "rounded-3xl",
    "5xl": "rounded-3xl",
  };

  let color = $derived(colorVar(colorCategoryProgress, "bg"));

  let backgroundImage = $derived((): string => {
    return `background-image: ${dotsImageVar(colorCategoryProgress)};`;
  });
  let progressColor = $derived((): string => {
    return `width: 100%; background: linear-gradient(to right, ${color} ${progressRate}%, transparent ${progressRate}%)`;
  });
  let isProgressRateOver50 = $derived(progressRate >= 50);
</script>

<div
  class={classNames(
    processing && "background-animate",
    "w-full",
    "flex",
    "flex-row",
    "items-center",
    rounded ? roundedSizes[size] : "rounded-none",
    // "border",
    // colorCategoryFront
    //   ? colorDefinitions[themeColor][colorCategoryBg].border
    //   : "border-inherit",
    colorCategoryBg ? colorClasses[colorCategoryBg].bg : "bg-inherit",
    barHeights[size],
    "",
  )}
  style={classNames(processing && backgroundImage())}
>
  <div
    class={classNames(
      "flex",
      "flex-row",
      barHeights[size],
      "w-full",
      // "border ",
      // colorCategoryBg
      //   ? colorDefinitions[themeColor][colorCategoryBg].border
      // : "border-inherit",

      rounded ? roundedSizes[size] : "rounded-none",
      "",
    )}
    style={progressColor()}
  >
    <BaseProgressBarForBlockNumberBodyBar
      {size}
      showLabel={isProgressRateOver50}
      isColoredBar={true}
      {progressRate}
      colorCategoryFront="white"
      colorCategoryBg="interactive"
    />
    <BaseProgressBarForBlockNumberBodyBar
      {size}
      showLabel={!isProgressRateOver50}
      isColoredBar={false}
      shadow={shadowBar}
      {progressRate}
      {colorCategoryFront}
      {colorCategoryBg}
    />
  </div>
</div>

<style lang="scss">
  .background-animate {
    -webkit-animation: DotStreaming 8s infinite linear;
    -moz-animation: DotStreaming 8s infinite linear;
    animation: DotStreaming 8s infinite linear;
  }
  @keyframes DotStreaming {
    from {
      background-position: right;
    }
    50% {
      background-position: center;
    }
    to {
      background-position: left;
    }
  }
</style>
