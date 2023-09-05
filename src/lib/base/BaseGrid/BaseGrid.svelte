<script lang="ts" generics="GridRow">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import type { ExportFilePrefix } from "@utils/utilsFile";
  import type {
    FilterChangedEvent,
    FirstDataRenderedEvent,
    GridApi,
    GridColumnsChangedEvent,
    GridOptions,
    SortChangedEvent,
  } from "ag-grid-community";
  import BaseGridFunctionBar from "./BaseGridFunctionBar.svelte";
  import GridBody, { setAutoColumnWidth } from "./GridBody/GridBody.svelte";
  import { ColIdRowSequenceNumber } from "./GridBody/getColumnDefs";
  import type { ColumnDef } from "./types";

  export let isFullScreen = false;
  export let paramColumnDefs: ColumnDef[];
  export let rows: GridRow[];
  export let exportFilePrefix: ExportFilePrefix;
  export let hasMultipulTabs: boolean;
  const rowHeight: number = 24;
  let gridOptions: GridOptions<GridRow> = {
    defaultColDef: {
      flex: 1,
      sortable: true,
      filter: true,
      editable: false,
      suppressMenu: false,
      resizable: true,
    },
    defaultColGroupDef: {
      openByDefault: true,
      marryChildren: true,
    },
    columnHoverHighlight: false,
    groupHeaderHeight: rowHeight,
    headerHeight: rowHeight,
    rowHeight: rowHeight,
    suppressFieldDotNotation: true,
    suppressRowTransform: false,
    suppressMovableColumns: false,
    rowSelection: "multiple",
    suppressColumnVirtualisation: true,
    pagination: true,
    paginationAutoPageSize: true,

    getRowClass: undefined,
    onSortChanged: (sortChangeEvent: SortChangedEvent): void => {
      refreshRowSeqenceNumber(sortChangeEvent.api);
    },
    onFilterChanged: (filterChangedEvent: FilterChangedEvent) => {
      refreshRowSeqenceNumber(filterChangedEvent.api);
    },
    onGridColumnsChanged: (
      gridColumnsChangedEvent: GridColumnsChangedEvent<GridRow>,
    ) => {
      setAutoColumnWidth(gridColumnsChangedEvent.columnApi);
    },

    onFirstDataRendered: (firstDataRenderedEvent: FirstDataRenderedEvent) => {
      setAutoColumnWidth(firstDataRenderedEvent.columnApi!);
    },
  };
  function refreshRowSeqenceNumber(gridApi: GridApi<GridRow>) {
    gridApi.refreshCells({ columns: [ColIdRowSequenceNumber] });
  }
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
