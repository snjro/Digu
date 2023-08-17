<script lang="ts">
  import classNames from "classnames";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize, type BaseSize } from "../baseSizes";
  import { getProgressRateForLabel } from "../BaseProgressBarForBlockNumber/progressRate";

  export let progressRate: number;
  export let textSize: BaseSize;
  export let isAnimatePulse: boolean;

  let animatePulse: "animate-pulse" | undefined;
  $: animatePulse = isAnimatePulse ? "animate-pulse" : undefined;
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "w-full",
    "justify-center",
    "items-end",
    "space-x-0.5"
    // "pl-2"
  )}
>
  <BaseLabel
    text={getProgressRateForLabel(progressRate)}
    {textSize}
    truncate={false}
    colorCategoryFront="primary"
    fontMono
    appendClass={animatePulse}
  />
  <BaseLabel
    text={"%"}
    textSize={changeSize(textSize, -3)}
    appendClass={animatePulse}
    fontMono
  />
</div>
