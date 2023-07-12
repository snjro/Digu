<script lang="ts">
  import classNames from "classnames";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import BaseProgressBarForBlockNumberChainExplorerLink from "./BaseProgressBarForBlockNumberChainExplorerLink.svelte";
  import BaseProgressBarForBlocknumberPointer from "./BaseProgressBarForBlocknumberPointer.svelte";
  export let size: BaseSize;
  export let colorCategoryFront: ColorCategory;
  export let colorCategoryBg: ColorCategory;
  export let startBlockNumber: number;
  export let endBlockNumber: number;
</script>

<BaseProgressBarForBlocknumberPointer
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
