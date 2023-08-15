<script lang="ts">
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import BaseInput from "$lib/base/BaseInput.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { GridOptions } from "ag-grid-community";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import classNames from "classnames";

  export let gridOptions: GridOptions;
  export let quickSearchText: string;
  $: {
    gridOptions.api?.setQuickFilter(quickSearchText);
  }
  const size: BaseSize = sizeSettings.gridFunctionQuickSearch;
</script>

<div class={classNames("max-w-2xl", "min-w-min", "w-full")}>
  <BaseInput
    placeholder="Quick search..."
    type="text"
    {size}
    bind:value={quickSearchText}
    colorCategory={colorSettings.gridFunctionInput}
    colorCategoryBorder={colorSettings.gridFunctionInputBorder}
  >
    <BaseIcon
      slot="prefixIcon"
      name="magnify"
      {size}
      hoverEffect={false}
      colorCategory={colorSettings.gridFunctionInput}
    />
    <BaseButtonIcon
      slot="suffixIcon"
      size={changeSize(size, -1)}
      tooltipText="clear"
      tooltipXPosition="right"
      tooltipYPosition="bottom"
      iconName="close"
      colorCategoryBg={colorSettings.gridFunctionButton}
      colorCategoryFront={colorSettings.gridFunctionButton}
      on:click={() => {
        quickSearchText = "";
      }}
    />
  </BaseInput>
</div>
