<script lang="ts">
  import classNames from "classnames";
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
  import { getProgressRate } from "../BaseProgressBarForBlockNumber/progressRate";
  import type { SyncStateTextLabelProps } from "$lib/common/CommonSyncStateText.svelte";
  import BaseProgressCircleSyncStatus from "./BaseProgressCircleSyncStatus.svelte";

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

  export let colorCategoryCircleBg: ColorCategory =
    colorSettings.progressCircleBg;

  export let syncStateTextLabelProps: SyncStateTextLabelProps | undefined =
    undefined;

  type TargetSize = {
    svgSize: number;
    strokeWidth: number;
    gapY: `gap-y-${number}`;
  };
  const sizes: { [key in BaseSize]: TargetSize } = {
    xs: { svgSize: 75, strokeWidth: 4, gapY: "gap-y-0" },
    sm: { svgSize: 125, strokeWidth: 8, gapY: "gap-y-0" },
    md: { svgSize: 200, strokeWidth: 12, gapY: "gap-y-0.5" },
    lg: { svgSize: 250, strokeWidth: 16, gapY: "gap-y-1.5" },
    xl: { svgSize: 300, strokeWidth: 20, gapY: "gap-y-1.5" },
    "2xl": { svgSize: 350, strokeWidth: 24, gapY: "gap-y-2" },
    "3xl": { svgSize: 400, strokeWidth: 28, gapY: "gap-y-2.5" },
    "4xl": { svgSize: 450, strokeWidth: 32, gapY: "gap-y-3" },
    "5xl": { svgSize: 500, strokeWidth: 38, gapY: "gap-y-3.5" },
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
  let progressRate: number;
  $: progressRate = getProgressRate(startValue, goalValue, currentValue);
  let offset: number;
  $: offset = (circumference * (100 - progressRate)) / 100;
  let isStopping: boolean;
  $: isStopping = syncStateTextLabelProps?.syncStateText === "stopping";
  let animatePulse: "animate-pulse" | undefined;
  $: animatePulse = isStopping ? "animate-pulse" : undefined;
  let colorCategoryCircleProgress: () => ColorCategory;
  $: colorCategoryCircleProgress = (): ColorCategory => {
    switch (syncStateTextLabelProps?.syncStateText) {
      case "syncing":
        return "success";
      case "stopping":
        return "secondary";
      default:
        return "interactive";
    }
  };
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
    "h-full",
    // "mx-10",
    animatePulse,
    ""
    // "bg-green-300",
  )}
>
  <svg
    viewBox={`0 0 ${targetSize.svgSize} ${targetSize.svgSize}`}
    xmlns="http://www.w3.org/2000/svg"
    class="max-w-[248px]"
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
      class={classNames(animatePulse)}
    />
    <circle
      r={radiusMinusStroke}
      cx={radiusPure}
      cy={radiusPure}
      fill="transparent"
      stroke={getColorHexWithSharpFromTailwindColor(
        colorDefinitions[themeColor][colorCategoryCircleProgress()].bg
      )}
      stroke-width={targetSize.strokeWidth}
      stroke-dasharray={`${circumference}px`}
      stroke-dashoffset={`${offset}px`}
      transform={`rotate(-90 ${radiusPure} ${radiusPure})`}
      class={classNames(animatePulse)}
    />
    <foreignObject
      x={targetSize.strokeWidth}
      y={targetSize.strokeWidth}
      width={targetSize.svgSize - targetSize.strokeWidth * 2}
      height={targetSize.svgSize - targetSize.strokeWidth * 2}
    >
      <div
        class={classNames(
          "flex",
          "flex-col",
          "justify-center",
          "h-full",
          "w-full",
          targetSize.gapY,
          ""
        )}
      >
        <BaseProgressCircleSyncStatus
          {progressRate}
          percentageSize={changeSize(circleSize, 5)}
          {syncStateTextLabelProps}
          isAnimatePulse={isStopping}
        />

        {#if detailsPosition === "inner"}
          <div class={classNames("w-full", "mx-1", "")}>
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
