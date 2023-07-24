<script lang="ts">
  import type { ExportFilePrefix } from "@utils/utilsFile";

  import "ag-grid-community/styles/ag-grid.css";
  import "ag-grid-community/styles/ag-theme-balham.css";
  // import "ag-grid-community/styles/ag-theme-balham-dark.css";
  import type { ColumnDef } from "./types";
  import FunctionBar from "./FunctionBar/FunctionBar.svelte";
  import GridBody from "./GridBody/GridBody.svelte";
  import { getGridOptions } from "./getGridOptions";
  import type { GridOptions, RowClassParams } from "ag-grid-community";
  import BasePageFullScreenContainer from "$lib/base/BasePage/BasePageFullScreenContainer.svelte";
  import GridFooter from "./GridFooter/GridFooter.svelte";

  type GridRow = $$Generic;
  export let paramColumnDefs: ColumnDef[];
  export let rows: GridRow[];
  export let getRowClass: ((params: RowClassParams) => string) | undefined =
    undefined;
  export let suppressFieldDotNotation: boolean = true;
  export let suppressRowTransform: boolean = false;
  export let suppressMovableColumns: boolean = false;
  export let suppressColumnVirtualisation: boolean = true;
  export let rowSelection: GridOptions["rowSelection"] = "multiple";
  export let titleCategoryLabelText: string;
  export let titleText: string;
  export let hidden: boolean;
  export let exportFilePrefix: ExportFilePrefix;
  let gridOptions: GridOptions<GridRow> = getGridOptions<GridRow>(
    suppressFieldDotNotation,
    suppressRowTransform,
    suppressMovableColumns,
    suppressColumnVirtualisation,
    rowSelection,
    getRowClass
    // rows
  );
  let isFullScreen = false;
</script>

<BasePageFullScreenContainer {hidden} {isFullScreen}>
  <FunctionBar
    {gridOptions}
    {rows}
    bind:isFullScreen
    {titleCategoryLabelText}
    {titleText}
    {exportFilePrefix}
  />
  <GridBody
    bind:gridOptions
    {paramColumnDefs}
    {rows}
    {hidden}
    isGridFullScreen={isFullScreen}
  />
  <GridFooter {gridOptions} {rows} />
</BasePageFullScreenContainer>

<!-- <style>
  :global(.abi-row-border-only-first) {
    border-top: solid 1px var(--color-frame-border) !important;
  }
  :global(.ag-theme-balham-dark .ag-cell) {
    border-left: solid 1px red;
  }
</style> -->
