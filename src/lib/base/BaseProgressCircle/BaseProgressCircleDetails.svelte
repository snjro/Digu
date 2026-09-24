<script lang="ts">
  import classNames from "classnames";
  import type { BaseSize } from "../baseSizes";
  import BaseProgressCircleDetailsItem from "./BaseProgressCircleDetailsItem.svelte";

  interface Props {
    startValue: number;
    currentValue: number;
    goalValue: number;
    textSize: BaseSize;
    fullLength: boolean;
  }

  let { startValue, currentValue, goalValue, textSize, fullLength }: Props =
    $props();
  const pxSizes: { [key in BaseSize]: `px-${string}` } = {
    xs: "px-2",
    sm: "px-3",
    md: "px-4",
    lg: "px-5",
    xl: "px-6",
    "2xl": "px-7",
    "3xl": "px-8",
    "4xl": "px-9",
    "5xl": "px-10",
  };
</script>

<div class={classNames("flex", "flex-col", pxSizes[textSize], "")}>
  <BaseProgressCircleDetailsItem title="start" value={startValue} {textSize} />
  <BaseProgressCircleDetailsItem
    title={fullLength ? "current" : "curr"}
    value={currentValue}
    {textSize}
  />
  <BaseProgressCircleDetailsItem title="goal" value={goalValue} {textSize} />
</div>
