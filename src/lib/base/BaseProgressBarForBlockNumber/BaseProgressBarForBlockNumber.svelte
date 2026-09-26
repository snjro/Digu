<script lang="ts" module>
  export type BaseProgressBarForBlockNumberProps = {
    processing: boolean;
    size: BaseSize;
    colorCategoryFront: ColorCategory;
    colorCategoryBg: ColorCategory;
    colorCategoryProgress: ColorCategory;
    startBlockNumber: number;
    endBlockNumber: number;
    fetchedBlockNumber: number;
  };
</script>

<script lang="ts">
  import classNames from "classnames";
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import BaseProgressBarForBlockNumberBody from "./BaseProgressBarForBlockNumberBody.svelte";
  import BaseProgressBarForBlockNumberChainExplorerLink from "./BaseProgressBarForBlockNumberChainExplorerLink.svelte";
  import BaseProgressBarForBlockNumberPointer from "./BaseProgressBarForBlockNumberPointer.svelte";
  import BaseProgressBarForBlockNumberEdgePointer from "./BaseProgressBarForBlockNumberEdgePointer.svelte";
  import { getProgressRate } from "./progressRate";

  interface Props {
    size?: BaseProgressBarForBlockNumberProps["size"];
    processing?: BaseProgressBarForBlockNumberProps["processing"];
    colorCategoryProgress?: BaseProgressBarForBlockNumberProps["colorCategoryProgress"];
    startBlockNumber: BaseProgressBarForBlockNumberProps["startBlockNumber"];
    endBlockNumber: BaseProgressBarForBlockNumberProps["endBlockNumber"];
    fetchedBlockNumber: BaseProgressBarForBlockNumberProps["fetchedBlockNumber"];
    showBlockNumber?: boolean;
    rounded?: boolean;
    shadowBar?: boolean;
    colorCategoryFront: BaseProgressBarForBlockNumberProps["colorCategoryFront"];
    colorCategoryBg: BaseProgressBarForBlockNumberProps["colorCategoryBg"];
  }

  let {
    size = "md",
    processing = false,
    colorCategoryProgress = "interactive",
    startBlockNumber,
    endBlockNumber,
    fetchedBlockNumber,
    showBlockNumber = true,
    rounded = false,
    shadowBar = true,
    colorCategoryFront,
    colorCategoryBg,
  }: Props = $props();

  let blockNumberTextSize: BaseSize = $derived(changeSize(size, -1));

  let progressRate = $derived(
    getProgressRate(startBlockNumber, endBlockNumber, fetchedBlockNumber),
  );
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "w-full",
    "h-fit",
    showBlockNumber && "px-12",
    "",
  )}
>
  <div
    class={classNames(
      "flex",
      "flex-col",
      "w-full",
      "h-fit",
      "items-start",
      "justify-start",
      "",
    )}
  >
    {#if showBlockNumber}
      <div
        class={classNames("flex", "justify-end")}
        style:width="{progressRate}%"
      >
        <div class={classNames("translate-x-1/2")}>
          <BaseProgressBarForBlockNumberChainExplorerLink
            blocknumber={fetchedBlockNumber}
            textSize={blockNumberTextSize}
          />
        </div>
      </div>
      <BaseProgressBarForBlockNumberPointer
        {size}
        {colorCategoryFront}
        {colorCategoryBg}
        {progressRate}
        isDynamicPointer
      />
    {/if}
    <BaseProgressBarForBlockNumberBody
      {processing}
      {progressRate}
      {size}
      {colorCategoryFront}
      {colorCategoryBg}
      {colorCategoryProgress}
      {rounded}
      {shadowBar}
    />
    {#if showBlockNumber}
      <BaseProgressBarForBlockNumberEdgePointer
        size={blockNumberTextSize}
        {colorCategoryFront}
        {colorCategoryBg}
        {startBlockNumber}
        {endBlockNumber}
      />
    {/if}
  </div>
</div>
