<script lang="ts">
  import {
    colorDefinitions,
    getColorHexWithSharpFromTailwindColor,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import { baseTextHeight, type BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";

  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  // import BaseLabel from "./BaseLabel.svelte";
  import BaseProgressBarForBlockNumberBodyBar from "./BaseProgressBarForBlockNumberBodyBar.svelte";
  export let processing: boolean;
  export let rounded: boolean;
  export let progressRate: number;
  export let size: BaseSize;
  export let colorCategoryFront: ColorCategory;
  export let colorCategoryBg: ColorCategory;
  export let colorCategoryProgress: ColorCategory;
  export let shadowBar: boolean = true;

  const barHeights: { [key in BaseSize]: string } = baseTextHeight;

  const roundedSizes: { [key in BaseSize]: string } = {
    xs: "rounded-sm",
    sm: "rounded",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    "3xl": "rounded-3xl",
    "4xl": "rounded-3xl",
    "5xl": "rounded-3xl",
  };

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;

  $: colorHexWithSharp = getColorHexWithSharpFromTailwindColor(
    colorDefinitions[themeColor][colorCategoryProgress].bg,
  );
  $: colorHexWithoutSharp = colorHexWithSharp.replace("#", "");

  $: backgroundImage = (): string => {
    const url = `'data:image/svg+xml;charset=UTF-8, <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24"><path fill="%23${colorHexWithoutSharp}" d="M12,10A2,2 0 0,0 10,12C10,13.11 10.9,14 12,14C13.11,14 14,13.11 14,12A2,2 0 0,0 12,10Z" /></svg>'`;
    return `background-image: url(${url});`;
  };
  $: progressColor = (): string => {
    return `width: 100%; background: linear-gradient(to right, ${colorHexWithSharp} ${progressRate}%, transparent ${progressRate}%)`;
  };
  $: isProgressRateOver50 = progressRate >= 50;
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
    colorCategoryBg
      ? colorDefinitions[themeColor][colorCategoryBg].bg
      : "bg-inherit",
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
