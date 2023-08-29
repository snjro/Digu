<script lang="ts" context="module">
  export function setAutoColumnWidth(
    columnApi: ColumnApi,
    skipHeader: boolean = false,
    waitMilliSecond: number = 0,
  ): void {
    columnApi.sizeColumnsToFit(0);
    setTimeout(() => {
      columnApi.autoSizeAllColumns(skipHeader);
    }, waitMilliSecond);
    // columnApi.autoSizeAllColumns(skipHeader);
  }
  export function setAllColumnGroupState(
    columnApi: ColumnApi,
    open: boolean,
  ): void {
    let stateItems: {
      groupId: string;
      open: boolean;
    }[] = [];
    for (const columnGroupState of columnApi.getColumnGroupState()) {
      stateItems.push({ groupId: columnGroupState.groupId, open: open });
    }
    columnApi.setColumnGroupState(stateItems);
    if (open) {
      setAutoColumnWidth(columnApi);
    }
  }
</script>

<script lang="ts" generics="GridRow">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";

  import "./gridBodyStyle.css";
  import { onDestroy, onMount } from "svelte";
  import {
    Grid,
    type GridOptions,
    // Column,
    type GridReadyEvent,
    ColumnApi,
    type RowClassParams,
    // type GridColumnsChangedEvent,
    // type FirstDataRenderedEvent,
  } from "ag-grid-community";
  import "ag-grid-community/styles/ag-grid.css";
  import "ag-grid-community/styles/ag-theme-balham.css";
  // import "ag-grid-community/styles/ag-theme-balham-dark.css";
  import classNames from "classnames";
  import type { ColumnDef } from "../types";
  import {
    // fColIdRowSequenceNumber,
    getColumnDefs,
  } from "./getColumnDefs";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getColorDefinitionsForGrid } from "./getColorDefs";
  import type { ThemeColor } from "@db/dbTypes";
  import { baseTextSizesPixel, type BaseSize } from "$lib/base/baseSizes";
  // import { afterNavigate } from "$app/navigation";

  export let gridOptions: GridOptions<GridRow>;
  export let paramColumnDefs: ColumnDef[] = [];
  export let rows: GridRow[];
  export let hidden: boolean;

  const gridTextSize: BaseSize = sizeSettings.grid;

  $: isThemeLight = $storeUserSettings.themeColor === "light";
  $: colorDefs = getColorDefinitionsForGrid(
    $storeUserSettings.themeColor as ThemeColor,
    colorSettings.gridHeader,
    colorSettings.gridRow,
  );

  let elementGridDiv: HTMLElement;
  let gridMain: Grid;
  onMount(() => {
    gridMain = new Grid(elementGridDiv, gridOptions);
    gridOptions.onGridReady = (
      gridReadyEvent: GridReadyEvent<GridRow>,
    ): void => {
      gridOptions.api = gridReadyEvent.api;
      gridOptions.columnApi = gridReadyEvent.columnApi;
      gridOptions.rowClassRules = {
        "first-row-in-group": (params: RowClassParams) => {
          return params.rowIndex !== 0 && params.data.isFirstRowInGroup;
        },
      };
      setAutoColumnWidth(gridOptions.columnApi!);
    };
  });

  onDestroy(() => {
    if (gridMain) {
      gridMain.destroy();
    }
  });

  //set row data
  $: {
    if (gridOptions && gridOptions.api) {
      // When columnDefs are updated,  an error occurs.
      // Because they are redrawn with the old row data with the new columnDefs.
      // To avoid errors, empty the row data beforehand
      gridOptions.api.setRowData([]);
      gridOptions.api.setColumnDefs(getColumnDefs(paramColumnDefs));
      if (!hidden) {
        gridOptions.api.setRowData(rows);
      }
    }
  }
  // Adjust all columns width only the first time it shows.
  // Because it not possible to autosize a column that is not visible on the screen.
  // https://www.ag-grid.com/javascript-data-grid/column-sizing/#auto-size-columns
  let isActivated: boolean = false;
  $: {
    if (hidden === false && isActivated === false && gridOptions.columnApi) {
      setAutoColumnWidth(gridOptions.columnApi);
      isActivated = true;
    }
  }
  $: gridClass = classNames(
    isThemeLight ? "ag-theme-balham" : "ag-theme-balham-dark",
    "h-full",
    "w-full",
    "",
  );
</script>

<div class={classNames("h-full", "pr-1.5")}>
  <div
    id="baseGridContainer"
    bind:this={elementGridDiv}
    class={gridClass}
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
</div>

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
