<script lang="ts" context="module">
  export function setAutoColumnWidth(
    gridApi: GridApi,
    skipHeader: boolean = false,
    waitMilliSecond: number = 0,
  ): void {
    gridApi.sizeColumnsToFit(0);
    setTimeout(() => {
      gridApi.autoSizeAllColumns(skipHeader);
    }, waitMilliSecond);
    // columnApi.autoSizeAllColumns(skipHeader);
  }
  export function setAllColumnGroupState(
    gridApi: GridApi,
    open: boolean,
  ): void {
    let stateItems: {
      groupId: string;
      open: boolean;
    }[] = [];
    for (const columnGroupState of gridApi.getColumnGroupState()) {
      stateItems.push({ groupId: columnGroupState.groupId, open: open });
    }
    gridApi.setColumnGroupState(stateItems);
    if (open) {
      setAutoColumnWidth(gridApi);
    }
  }
</script>

<script lang="ts" generics="GridRow">
  import BaseSpinner from "$lib/base/BaseSpinner.svelte";
  import {
    AbstractOverlayRenderer,
    loadingOverlayRendererFactory,
  } from "./loadingOverlayRenderFactory";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import {
    type GridOptions,
    GridApi,
    type SortChangedEvent,
    type FilterChangedEvent,
    type GridColumnsChangedEvent,
    type FirstDataRenderedEvent,
    createGrid,
  } from "ag-grid-community";
  import "ag-grid-community/styles/ag-grid.css";
  import "ag-grid-community/styles/ag-theme-balham.css";
  import { onDestroy, onMount } from "svelte";
  import "./gridBodyStyle.css";
  import { baseTextSizesPixel, type BaseSize } from "$lib/base/baseSizes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import type { ColumnDef } from "../types";
  import { getColorDefinitionsForGrid } from "./getColorDefs";
  import { getColumnDefs, ColIdRowSequenceNumber } from "./getColumnDefs";

  export let gridApi: GridApi<GridRow>;
  export let paramColumnDefs: ColumnDef[] = [];
  export let rows: GridRow[] | undefined;

  const gridTextSize: BaseSize = sizeSettings.grid;

  $: isThemeLight = $storeUserSettings.themeColor === "light";
  $: colorDefs = getColorDefinitionsForGrid(
    $storeUserSettings.themeColor,
    colorSettings.gridHeader,
    colorSettings.gridRow,
  );
  function refreshRowSeqenceNumber(gridApi: GridApi<GridRow>) {
    gridApi.refreshCells({ columns: [ColIdRowSequenceNumber] });
  }

  let elementGridDiv: HTMLElement;
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
    overlayLoadingTemplate: "Loading...",
    overlayNoRowsTemplate: "No data",
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
      setAutoColumnWidth(gridColumnsChangedEvent.api);
    },

    onFirstDataRendered: (firstDataRenderedEvent: FirstDataRenderedEvent) => {
      setAutoColumnWidth(firstDataRenderedEvent.api);
    },
    loadingOverlayComponent: loadingOverlayRendererFactory(
      (overLay: AbstractOverlayRenderer) => {
        new BaseSpinner({
          target: overLay.eGui,
          props: { size: "xl", trackColor: "primary" },
        });
      },
    ),
  };

  onMount(() => {
    gridApi = createGrid(elementGridDiv, gridOptions);
    gridOptions = {
      onGridReady: (): void => {
        setAutoColumnWidth(gridApi);
      },
    };
  });

  onDestroy(() => {
    if (gridApi) {
      gridApi.destroy();
    }
  });

  //set row data
  $: {
    if (gridOptions && gridApi) {
      gridApi.setGridOption("columnDefs", getColumnDefs(paramColumnDefs));
      if (rows == undefined) {
        gridApi.hideOverlay();
        gridApi.showNoRowsOverlay();
      } else {
        if (rows && rows.length) {
          gridApi.hideOverlay();
          gridApi.showLoadingOverlay();
        } else {
          gridApi.hideOverlay();
          gridApi.showNoRowsOverlay();
        }
        gridApi.setGridOption("rowData", rows);
      }
    }
  }
  // Adjust all columns width only the first time it shows.
  // Because it not possible to autosize a column that is not visible on the screen.
  // https://www.ag-grid.com/javascript-data-grid/column-sizing/#auto-size-columns
  let isActivated: boolean = false;
  $: {
    if (isActivated === false && gridApi) {
      setAutoColumnWidth(gridApi);
      isActivated = true;
    }
  }

  $: agTheme = isThemeLight ? "ag-theme-balham" : "ag-theme-balham-dark";
</script>

<div
  id="baseGridContainer"
  bind:this={elementGridDiv}
  class={classNames(agTheme, "h-full", "w-full", "")}
  style={classNames(
    `--font-size:${baseTextSizesPixel[gridTextSize]};`,
    `--color-frame-border:${colorDefs.frame.border};`,
    `--color-header-text:${colorDefs.header.text};`,
    `--color-header-bg:${colorDefs.header.bg};`,
    `--color-row-bg:${colorDefs.row.bg};`,
    `--color-row-text:${colorDefs.row.text};`,
    `--color-row-hover:${colorDefs.row.hover};`,
    `--color-row-border:${colorDefs.row.border};`,
  )}
/>

<style>
  /* :global(.cell-span) {
    background-color: var(--color-row-bg);
    border-bottom: var(--color-row-border);
  } */

  /* :global(.abi-row-border-only-first) {
    border-top: solid 1px var(--color-frame-border) !important;
  } */
  /* :global(.ag-theme-balham-dark .ag-cell) {
    border-left: solid 1px red;
  } */
</style>
