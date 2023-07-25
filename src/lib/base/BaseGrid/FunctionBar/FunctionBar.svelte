<script lang="ts">
  import type { ExportFilePrefix } from "@utils/utilsFile";
  import CommonFunctionBar from "$lib/common/CommonFunctionBar/CommonFunctionBar.svelte";
  import type { GridOptions } from "ag-grid-community";
  import FunctionButtons from "./FunctionButtons.svelte";
  import QuickSearch from "./QuickSearch.svelte";

  type GridRow = $$Generic;
  export let gridOptions: GridOptions<GridRow>;
  export let rows: GridRow[];
  export let isFullScreen: boolean;
  export let titleCategoryLabelText: string;
  export let titleText: string;
  export let exportFilePrefix: ExportFilePrefix;

  let quickSearchText: string = "";
</script>

<CommonFunctionBar
  {isFullScreen}
  {titleCategoryLabelText}
  {titleText}
  isVerticalTitle={true}
>
  <QuickSearch bind:quickSearchText {gridOptions} />
  <FunctionButtons
    bind:quickSearchText
    {gridOptions}
    {rows}
    bind:isFullScreen
    {exportFilePrefix}
  />
</CommonFunctionBar>
