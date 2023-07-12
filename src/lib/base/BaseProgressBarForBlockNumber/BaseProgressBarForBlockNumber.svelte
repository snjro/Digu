<script lang="ts" context="module">
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
  import { round } from "@utils/utilsMath";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import BaseProgressBarForBlockNumberBody from "./BaseProgressBarForBlockNumberBody.svelte";
  import BaseProgressBarForBlockNumberChainExplorerLink from "./BaseProgressBarForBlockNumberChainExplorerLink.svelte";
  import BaseProgressBarForBlocknumberPointer from "./BaseProgressBarForBlocknumberPointer.svelte";
  import BaseProgressBarForBlocknumberEdgePointer from "./BaseProgressBarForBlocknumberEdgePointer.svelte";

  export let size: BaseProgressBarForBlockNumberProps["size"] = "md";
  export let processing: BaseProgressBarForBlockNumberProps["processing"] =
    false;
  export let colorCategoryProgress: BaseProgressBarForBlockNumberProps["colorCategoryProgress"] =
    "interactive";
  export let startBlockNumber: BaseProgressBarForBlockNumberProps["startBlockNumber"];
  export let endBlockNumber: BaseProgressBarForBlockNumberProps["endBlockNumber"];
  export let fetchedBlockNumber: BaseProgressBarForBlockNumberProps["fetchedBlockNumber"];
  export let showBlockNumber: boolean = true;
  export let rounded: boolean = false;
  export let shadowBar: boolean = true;

  export let colorCategoryFront: BaseProgressBarForBlockNumberProps["colorCategoryFront"];
  export let colorCategoryBg: BaseProgressBarForBlockNumberProps["colorCategoryBg"];

  const blockNumberTextSize: BaseSize = changeSize(size, -1);

  $: numOfProcessedBlock = fetchedBlockNumber - startBlockNumber;
  $: numOfStartToEndBlock = endBlockNumber - startBlockNumber;
  $: progressRate = round(
    (numOfProcessedBlock * 100) / numOfStartToEndBlock,
    3
  );
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "w-full",
    "h-fit",
    showBlockNumber && "px-12",
    ""
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
      ""
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
      <BaseProgressBarForBlocknumberPointer
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
      <BaseProgressBarForBlocknumberEdgePointer
        size={blockNumberTextSize}
        {colorCategoryFront}
        {colorCategoryBg}
        {startBlockNumber}
        {endBlockNumber}
      />
    {/if}
  </div>
</div>
