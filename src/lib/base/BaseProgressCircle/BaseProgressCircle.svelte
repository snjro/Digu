<script lang="ts">
  import { round } from "@utils/utilsMath";
  import classNames from "classnames";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import {
    colorDefinitions,
    getColorHexWithSharpFromTailwindColor,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import BaseProgressCircleDetails from "./BaseProgressCircleDetails.svelte";
  import { changeSize, type BaseSize } from "../baseSizes";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let startValue: number;
  export let goalValue: number;
  export let currentValue: number;
  export let circleSize: BaseSize;
  export let detailsTextSize: BaseSize = circleSize;

  export let detailsPosition:
    | "inner"
    | "right"
    | "left"
    | "bottom"
    | "top"
    | "none" = "inner";
  export let colorCategoryCircleProgress: ColorCategory = "interactive";
  const colorCategoryCircleBg: ColorCategory = colorSettings.progressCircleBg;

  type TargetSize = {
    svgSize: number;
    strokeWidth: number;
    gapY: `gap-y-${number}`;
  };
  const sizes: { [key in BaseSize]: TargetSize } = {
    xs: { svgSize: 75, strokeWidth: 3, gapY: "gap-y-0" },
    sm: { svgSize: 125, strokeWidth: 6, gapY: "gap-y-0" },
    md: { svgSize: 200, strokeWidth: 9, gapY: "gap-y-0.5" },
    lg: { svgSize: 250, strokeWidth: 12, gapY: "gap-y-1.5" },
    xl: { svgSize: 300, strokeWidth: 15, gapY: "gap-y-1.5" },
    "2xl": { svgSize: 350, strokeWidth: 18, gapY: "gap-y-2" },
    "3xl": { svgSize: 400, strokeWidth: 21, gapY: "gap-y-2.5" },
    "4xl": { svgSize: 450, strokeWidth: 24, gapY: "gap-y-3" },
    "5xl": { svgSize: 500, strokeWidth: 27, gapY: "gap-y-3.5" },
  };
  let targetSize: TargetSize;
  $: targetSize = sizes[circleSize];
  let radiusPure: number;
  $: radiusPure = targetSize.svgSize / 2;
  let radiusMinusStroke: number;
  $: radiusMinusStroke = radiusPure - targetSize.strokeWidth / 2;
  let circumference: number;
  $: circumference = 2 * Math.PI * radiusMinusStroke;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
  let fullLength: number;
  $: fullLength = goalValue - startValue;
  let processedLength: number;
  $: processedLength = currentValue - startValue;
  let progressRate: () => number;
  $: progressRate = (): number => {
    let rate: number = round((processedLength * 100) / fullLength, 3);
    return isNaN(rate) ? 0 : rate;
  };
  let offset: number;
  $: offset = (circumference * (100 - progressRate())) / 100;
</script>

<div
  class={classNames(
    "flex",
    detailsPosition === "right" && "flex-row",
    detailsPosition === "left" && "flex-row-reverse",
    detailsPosition === "bottom" && "flex-col",
    detailsPosition === "top" && "flex-col-reverse",
    "items-center",
    "justify-center",
    (detailsPosition === "right" || detailsPosition === "left") && "space-x-3",
    (detailsPosition === "top" || detailsPosition === "bottom") && "space-y-3",
    "w-full",
    "h-fit",
    // "mx-10",
    ""
    // "bg-green-300",
  )}
>
  <svg
    viewBox={`0 0 ${targetSize.svgSize} ${targetSize.svgSize}`}
    xmlns="http://www.w3.org/2000/svg"
    class={classNames("max-w-xs")}
  >
    <circle
      r={radiusMinusStroke}
      cx={radiusPure}
      cy={radiusPure}
      fill="transparent"
      stroke={getColorHexWithSharpFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryCircleBg].bg
      )}
      stroke-width={targetSize.strokeWidth}
    />
    <circle
      r={radiusMinusStroke}
      cx={radiusPure}
      cy={radiusPure}
      fill="transparent"
      stroke={getColorHexWithSharpFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryCircleProgress].bg
      )}
      stroke-width={targetSize.strokeWidth}
      stroke-dasharray={`${circumference}px`}
      stroke-dashoffset={`${offset}px`}
      transform={`rotate(-90 ${radiusPure} ${radiusPure})`}
    />
    <foreignObject
      x={targetSize.strokeWidth}
      y={targetSize.strokeWidth}
      width={targetSize.svgSize - targetSize.strokeWidth * 2}
      height={targetSize.svgSize - targetSize.strokeWidth * 2}
    >
      <div
        class={classNames(
          "grid",
          "place-content-center",
          "h-full",
          "w-full",
          targetSize.gapY,
          ""
        )}
      >
        <div class={classNames("col-span-full", "", "")}>
          <div
            class={classNames(
              "flex",
              "flex-row",
              "w-full",
              "justify-center",
              "items-end",
              "pl-2"
            )}
          >
            <BaseLabel
              text={progressRate() >= 100
                ? progressRate().toFixed(0)
                : progressRate().toFixed(1)}
              textSize={detailsPosition === "inner"
                ? changeSize(circleSize, 5)
                : changeSize(circleSize, 5)}
              truncate={false}
            />
            <BaseLabel text={"%"} textSize={changeSize(circleSize, 0)} />
          </div>
        </div>
        {#if detailsPosition === "inner"}
          <div class={classNames("col-span-full", "mx-1", "")}>
            <BaseProgressCircleDetails
              {startValue}
              {currentValue}
              {goalValue}
              textSize={circleSize}
              fullLength={false}
            />
          </div>
        {/if}
      </div>
    </foreignObject>
  </svg>
  {#if detailsPosition !== "inner" && detailsPosition !== "none"}
    <BaseProgressCircleDetails
      {startValue}
      {currentValue}
      {goalValue}
      textSize={detailsTextSize}
      fullLength
    />
  {/if}
</div>
