<script lang="ts">
  import classNames from "classnames";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import BaseProgressBarForBlockNumberChainExplorerLink from "./BaseProgressBarForBlockNumberChainExplorerLink.svelte";
  import BaseProgressBarForBlockNumberPointer from "./BaseProgressBarForBlockNumberPointer.svelte";
  interface Props {
    size: BaseSize;
    colorCategoryFront: ColorCategory;
    colorCategoryBg: ColorCategory;
    startBlockNumber: number;
    endBlockNumber: number;
  }

  let {
    size,
    colorCategoryFront,
    colorCategoryBg,
    startBlockNumber,
    endBlockNumber,
  }: Props = $props();
</script>

<BaseProgressBarForBlockNumberPointer
  {size}
  {colorCategoryFront}
  {colorCategoryBg}
/>
<div class={classNames("flex", "justify-between", "w-full")}>
  <div class={classNames("-translate-x-1/2")}>
    <BaseProgressBarForBlockNumberChainExplorerLink
      blocknumber={startBlockNumber}
      textSize={size}
    />
  </div>
  <div class={classNames("translate-x-1/2")}>
    <BaseProgressBarForBlockNumberChainExplorerLink
      blocknumber={endBlockNumber}
      textSize={size}
    />
  </div>
</div>
