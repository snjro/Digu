<script lang="ts" generics="GridRow">
  import GridLoadingOverlay from "./GridLoadingOverlay.svelte";
  import { setAutoColumnWidth } from "../gridColumns";
  import {
    AbstractOverlayRenderer,
    loadingOverlayRendererFactory,
  } from "./loadingOverlayRenderFactory";
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import {
    type GridOptions,
    type IDatasource,
    type ILoadingOverlayParams,
    type GridApi,
    type SortChangedEvent,
    type FilterChangedEvent,
    type GridColumnsChangedEvent,
    type FirstDataRenderedEvent,
    createGrid,
    ModuleRegistry,
    CellStyleModule,
    ClientSideRowModelModule,
    ColumnApiModule,
    ColumnAutoSizeModule,
    CsvExportModule,
    DateFilterModule,
    EventApiModule,
    ExternalFilterModule,
    InfiniteRowModelModule,
    NumberFilterModule,
    PaginationModule,
    QuickFilterModule,
    RenderApiModule,
    RowApiModule,
    RowSelectionModule,
    TextFilterModule,
    enableDevValidations,
    themeBalham,
  } from "ag-grid-community";
  import { onDestroy, onMount, untrack } from "svelte";
  import "./gridBodyStyle.css";
  import { baseTextSizesPixel, type BaseSize } from "#lib/base/baseSizes.js";
  import classNames from "classnames";
  import type { ColumnDef } from "../types";
  import type { InfiniteRows } from "../infiniteRows";
  import { getColorDefinitionsForGrid } from "./getColorDefs";
  import { getColumnDefs, ColIdRowSequenceNumber } from "./getColumnDefs";
  import { suppressKeyboardEventInCell } from "./suppressKeyboardEventInCell";

  interface Props {
    gridApi: GridApi<GridRow> | undefined;
    paramColumnDefs?: ColumnDef[];
    // The rows of the Client-Side Row Model.
    rows?: GridRow[] | undefined;
    // In place of rows, for the Infinite Row Model.
    infiniteRows?: InfiniteRows<GridRow>;
    loadingText?: string;
  }

  let {
    gridApi = $bindable(),
    paramColumnDefs = [],
    rows,
    infiniteRows,
    loadingText,
  }: Props = $props();

  // ag-grid takes the row model only when it creates the grid.
  const infiniteOptions: GridOptions<GridRow> | undefined = untrack(() => {
    const initialInfiniteRows: InfiniteRows<GridRow> | undefined = infiniteRows;
    if (!initialInfiniteRows) return undefined;
    const quickSearch: { text: string } = initialInfiniteRows.quickSearch;
    return {
      rowModelType: "infinite",
      getRowId: initialInfiniteRows.getRowId,
      // The page keeps up to 10 blocks of 100 rows.
      maxBlocksInCache: 10,
      // So that ag-grid tells no matching rows from no rows, as for its own
      // quick search. The datasource filters the rows.
      isExternalFilterPresent: () => quickSearch.text !== "",
      doesExternalFilterPass: () => true,
    };
  });

  const gridTextSize: BaseSize = sizeSettings.grid;

  // ag-grid adds loadingOverlayComponentParams to the params of the overlay.
  type LoadingTextParams = { loadingText?: string };

  const colorDefs = getColorDefinitionsForGrid(
    colorSettings.gridHeader,
    colorSettings.gridRow,
  );
  function refreshRowSequenceNumber(gridApi: GridApi<GridRow>) {
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
      suppressKeyboardEvent: suppressKeyboardEventInCell,
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
      refreshRowSequenceNumber(sortChangeEvent.api);
    },
    onFilterChanged: (filterChangedEvent: FilterChangedEvent) => {
      refreshRowSequenceNumber(filterChangedEvent.api);
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
      (overLay: AbstractOverlayRenderer, params: ILoadingOverlayParams) => {
        overLay.mount(GridLoadingOverlay, {
          target: overLay.eGui,
          props: { text: (params as LoadingTextParams).loadingText },
        });
      },
    ),
    ...infiniteOptions,
  });

  onMount(() => {
    if (import.meta.env.DEV) {
      enableDevValidations();
    }
    // Only the features the grids use. The date filter is for the ISO 8601
    // strings, which ag-grid infers as dateTimeString. The event and row APIs
    // are for the row count of the CSV dialog. The external filter is for the
    // quick search of the Infinite Row Model.
    ModuleRegistry.registerModules([
      CellStyleModule,
      ClientSideRowModelModule,
      ColumnApiModule,
      ColumnAutoSizeModule,
      CsvExportModule,
      DateFilterModule,
      EventApiModule,
      ExternalFilterModule,
      InfiniteRowModelModule,
      NumberFilterModule,
      PaginationModule,
      QuickFilterModule,
      RenderApiModule,
      RowApiModule,
      RowSelectionModule,
      TextFilterModule,
    ]);
    gridApi = createGrid(elementGridDiv, gridOptions);
  });

  onDestroy(() => {
    if (gridApi) {
      gridApi.destroy();
      // The parent may keep it through the binding and give it to the next grid.
      gridApi = undefined;
    }
  });

  // Set the columns only when they change, so new rows keep the column state.
  $effect.pre(() => {
    if (gridOptions && gridApi) {
      const api: GridApi<GridRow> = gridApi;
      const columnDefs: ColumnDef[] = paramColumnDefs;
      untrack(() => {
        api.setGridOption("columnDefs", getColumnDefs(columnDefs));
      });
    }
  });
  // Before the rows, so the loading overlay shows the text at once. ag-grid
  // mounts the overlay again when it changes, so only then.
  let passedLoadingText: string | undefined = undefined;
  $effect.pre(() => {
    if (gridApi) {
      const api: GridApi<GridRow> = gridApi;
      const text: string | undefined = loadingText;
      if (text === passedLoadingText) return;
      passedLoadingText = text;
      const params: LoadingTextParams = { loadingText: text };
      untrack(() => {
        api.setGridOption("loadingOverlayComponentParams", params);
      });
    }
  });
  //set row data
  $effect.pre(() => {
    if (gridOptions && gridApi && !infiniteOptions) {
      const api: GridApi<GridRow> = gridApi;
      const rowData: GridRow[] | undefined = rows;
      // Like the legacy `$:`, rerun only when the values read above change, and
      // keep the components that ag-grid mounts here out of this effect.
      untrack(() => {
        if (rowData == undefined) {
          // The rows are still loading. The loading overlay replaces any other.
          api.setGridOption("loading", true);
        } else {
          if (rowData && rowData.length) {
            // While loading is true, the grid shows the loading overlay and
            // does not hide it.
            if (!api.getGridOption("loading")) {
              api.hideOverlay();
            }
            api.setGridOption("loading", true);
          } else {
            // While loading is true, the grid neither hides nor shows an overlay.
            api.setGridOption("loading", false);
            api.hideOverlay();
            api.showNoRowsOverlay();
          }
          api.setGridOption("rowData", rowData);
          if (rowData && rowData.length) {
            api.setGridOption("loading", false);
          }
        }
      });
    }
  });
  // The loading overlay replaces any other while there is no datasource. A new
  // datasource makes ag-grid read the rows again.
  let passedDatasource: IDatasource | undefined = undefined;
  $effect.pre(() => {
    if (gridApi && infiniteOptions) {
      const api: GridApi<GridRow> = gridApi;
      const datasource: IDatasource | undefined = infiniteRows?.datasource;
      untrack(() => {
        if (datasource === undefined) {
          api.setGridOption("loading", true);
          return;
        }
        if (datasource === passedDatasource) return;
        passedDatasource = datasource;
        api.setGridOption("loading", false);
        api.setGridOption("datasource", datasource);
      });
    }
  });
  // Adjust all columns width only the first time it shows.
  // Because it not possible to autosize a column that is not visible on the screen.
  // https://www.ag-grid.com/javascript-data-grid/column-sizing/#auto-size-columns
  let isActivated: boolean = false;
  $effect.pre(() => {
    if (isActivated === false && gridApi) {
      const api: GridApi<GridRow> = gridApi;
      // Same as above: ag-grid may mount components while sizing the columns.
      untrack(() => setAutoColumnWidth(api));
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
