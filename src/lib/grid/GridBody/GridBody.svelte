<script lang="ts" generics="GridRow">
  import BaseSpinner from "$lib/base/BaseSpinner.svelte";
  import { setAutoColumnWidth } from "../gridColumns";
  import {
    AbstractOverlayRenderer,
    loadingOverlayRendererFactory,
  } from "./loadingOverlayRenderFactory";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import {
    type GridOptions,
    type GridApi,
    type SortChangedEvent,
    type FilterChangedEvent,
    type GridColumnsChangedEvent,
    type FirstDataRenderedEvent,
    createGrid,
    ModuleRegistry,
    AllCommunityModule,
    enableDevValidations,
    themeBalham,
  } from "ag-grid-community";
  import { onDestroy, onMount, untrack } from "svelte";
  import "./gridBodyStyle.css";
  import { baseTextSizesPixel, type BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import type { ColumnDef } from "../types";
  import { getColorDefinitionsForGrid } from "./getColorDefs";
  import { getColumnDefs, ColIdRowSequenceNumber } from "./getColumnDefs";

  interface Props {
    gridApi: GridApi<GridRow>;
    paramColumnDefs?: ColumnDef[];
    rows: GridRow[] | undefined;
  }

  let { gridApi = $bindable(), paramColumnDefs = [], rows }: Props = $props();

  const gridTextSize: BaseSize = sizeSettings.grid;

  const colorDefs = getColorDefinitionsForGrid(
    colorSettings.gridHeader,
    colorSettings.gridRow,
  );
  function refreshRowSeqenceNumber(gridApi: GridApi<GridRow>) {
    gridApi.refreshCells({ columns: [ColIdRowSequenceNumber] });
  }

  let elementGridDiv: HTMLElement = $state() as HTMLElement;
  const rowHeight: number = 24;
  let gridOptions: GridOptions<GridRow> = $state.raw({
    theme: themeBalham,
    defaultColDef: {
      flex: 1,
      sortable: true,
      filter: true,
      editable: false,
      suppressHeaderMenuButton: false,
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
    rowSelection: {
      mode: "multiRow",
      checkboxes: false,
      headerCheckbox: false,
      enableClickSelection: true,
    },
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
        overLay.mount(BaseSpinner, {
          target: overLay.eGui,
          props: { size: "xl", trackColor: "primary" },
        });
      },
    ),
  });

  onMount(() => {
    if (import.meta.env.DEV) {
      enableDevValidations();
    }
    ModuleRegistry.registerModules([AllCommunityModule]);
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
  $effect.pre(() => {
    if (gridOptions && gridApi) {
      const columnDefs: ColumnDef[] = paramColumnDefs;
      const rowData: GridRow[] | undefined = rows;
      // Like the legacy `$:`, rerun only when the values read above change, and
      // keep the components that ag-grid mounts here out of this effect.
      untrack(() => {
        gridApi.setGridOption("columnDefs", getColumnDefs(columnDefs));
        if (rowData == undefined) {
          gridApi.hideOverlay();
          gridApi.showNoRowsOverlay();
        } else {
          if (rowData && rowData.length) {
            gridApi.hideOverlay();
            gridApi.setGridOption("loading", true);
          } else {
            gridApi.hideOverlay();
            gridApi.showNoRowsOverlay();
          }
          gridApi.setGridOption("rowData", rowData);
          if (rowData && rowData.length) {
            gridApi.setGridOption("loading", false);
          }
        }
      });
    }
  });
  // Adjust all columns width only the first time it shows.
  // Because it not possible to autosize a column that is not visible on the screen.
  // https://www.ag-grid.com/javascript-data-grid/column-sizing/#auto-size-columns
  let isActivated: boolean = false;
  $effect.pre(() => {
    if (isActivated === false && gridApi) {
      // Same as above: ag-grid may mount components while sizing the columns.
      untrack(() => setAutoColumnWidth(gridApi));
      isActivated = true;
    }
  });
</script>

<div
  id="baseGridContainer"
  bind:this={elementGridDiv}
  class={classNames("h-full", "w-full", "")}
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
></div>

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
