<script lang="ts" generics="GridRow">
  import BaseGridFooter from "./BaseGridFooter.svelte";

  import BaseGridFunctionBar from "./BaseGridFunctionBar.svelte";

  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import type { ExportFilePrefix } from "@utils/utilsFile";
  import "ag-grid-community/styles/ag-grid.css";
  import "ag-grid-community/styles/ag-theme-balham.css";
  // import "ag-grid-community/styles/ag-theme-balham-dark.css";
  import type { GridOptions, RowClassParams } from "ag-grid-community";
  import GridBody from "./GridBody/GridBody.svelte";
  import { getGridOptions } from "./getGridOptions";
  import type { ColumnDef } from "./types";

  export let isFullScreen = false;
  export let paramColumnDefs: ColumnDef[];
  export let rows: GridRow[];
  export let exportFilePrefix: ExportFilePrefix;
  export let hasMultipulTabs: boolean;
  export let paramsForGridOptions: {
    suppressFieldDotNotation: boolean;
    suppressRowTransform: boolean;
    suppressMovableColumns: boolean;
    suppressColumnVirtualisation: boolean;
    rowSelection: GridOptions["rowSelection"];
    getRowClass: ((params: RowClassParams) => string) | undefined;
  } = {
    suppressFieldDotNotation: true,
    suppressRowTransform: false,
    suppressMovableColumns: false,
    suppressColumnVirtualisation: true,
    rowSelection: "multiple",
    getRowClass: undefined,
  };

  let gridOptions: GridOptions<GridRow> = getGridOptions<GridRow>(
    paramsForGridOptions.suppressFieldDotNotation,
    paramsForGridOptions.suppressRowTransform,
    paramsForGridOptions.suppressMovableColumns,
    paramsForGridOptions.suppressColumnVirtualisation,
    paramsForGridOptions.rowSelection,
    paramsForGridOptions.getRowClass,
  );
</script>

<PageWrapperContent isAgGrid {hasMultipulTabs}>
  <BaseGridFunctionBar
    slot="PageWrapperContentFunctionBar"
    {gridOptions}
    {rows}
    bind:isFullScreen
    {exportFilePrefix}
  />

  <div class="flex flex-col h-full" slot="PageWrapperContentBody">
    <GridBody bind:gridOptions {paramColumnDefs} {rows} />
    <BaseGridFooter {gridOptions} {rows} />
  </div>
</PageWrapperContent>
<!-- <style>
  :global(.abi-row-border-only-first) {
    border-top: solid 1px var(--color-frame-border) !important;
  }
  :global(.ag-theme-balham-dark .ag-cell) {
    border-left: solid 1px red;
  }
</style> -->
