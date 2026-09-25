<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import BaseInput from "$lib/base/BaseInput.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import type { GridApi } from "ag-grid-community";
  import classNames from "classnames";
  import { untrack } from "svelte";

  interface Props {
    gridApi: GridApi;
    quickSearchText: string;
  }

  let { gridApi, quickSearchText = $bindable() }: Props = $props();
  $effect.pre(() => {
    const api: GridApi = gridApi;
    const text: string = quickSearchText;
    // Rerun only when these two change, not on what ag-grid reads while filtering.
    untrack(() => api?.setGridOption("quickFilterText", text));
  });
  const size: BaseSize = sizeSettings.gridFunctionQuickSearch;
</script>

<div class={classNames("max-w-2xl", "min-w-min", "w-full")}>
  <BaseInput
    placeholder="Quick search..."
    ariaLabel="Quick search"
    type="text"
    {size}
    bind:value={quickSearchText}
    colorCategory={colorSettings.gridFunctionInput}
    colorCategoryBorder={colorSettings.gridFunctionInputBorder}
  >
    {#snippet prefixIcon()}
      <BaseIcon
        name="magnify"
        {size}
        hoverEffect={false}
        colorCategory={colorSettings.gridFunctionInput}
      />
    {/snippet}
    {#snippet suffixIcon()}
      <BaseButtonIcon
        size={changeSize(size, -1)}
        tooltipText="clear"
        tooltipXPosition="right"
        tooltipYPosition="bottom"
        iconName="close"
        colorCategoryBg={colorSettings.gridFunctionButton}
        colorCategoryFront={colorSettings.gridFunctionButton}
        onclick={() => {
          quickSearchText = "";
        }}
      />
    {/snippet}
  </BaseInput>
</div>
