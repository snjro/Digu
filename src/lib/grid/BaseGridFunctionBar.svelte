<script lang="ts" generics="GridRow">
  import BaseGridFunctionBarQuickSearch from "./BaseGridFunctionBarQuickSearch.svelte";

  import type { ExportFilePrefix } from "#utils/utilsFile.js";

  import { breakPointWidthThresholds } from "#lib/appearanceConfig/size/sizeDefinitions.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import PageWrapperContentFunctionBar from "#lib/PageWrapper/PageWrapperContentFunctionBar.svelte";
  import {
    fullScreenButtonDefinition,
    type PageWrapperContentFunctionBarButtonsDefinition,
  } from "#lib/PageWrapper/PageWrapperContentFunctionBarButtons.svelte";
  import type { GridApi } from "ag-grid-community";
  import ExportCsv, { openDialogExportCsv } from "./ExportCsv/ExportCsv.svelte";
  import {
    setAllColumnGroupState,
    setAutoColumnWidth,
    setAutoColumnWidthWhenRowsCome,
  } from "./gridColumns";
  import type { InfiniteRows } from "./infiniteRows";

  interface Props {
    gridApi: GridApi<GridRow> | undefined;
    rows?: GridRow[] | undefined;
    infiniteRows?: InfiniteRows<GridRow>;
    isFullScreen: boolean;
    exportFilePrefix: ExportFilePrefix;
  }

  let {
    gridApi,
    rows,
    infiniteRows,
    isFullScreen = $bindable(),
    exportFilePrefix,
  }: Props = $props();

  let quickSearchText: string = $state("");

  let buttonDefinitionShowHideColumns: PageWrapperContentFunctionBarButtonsDefinition[number] =
    $derived([
      {
        iconName: "arrowExpandHorizontal",
        tooltipText: "Show all columns",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: () => {
          if (gridApi) setAllColumnGroupState(gridApi, true);
        },
      },
      {
        iconName: "arrowCollapseHorizontal",
        tooltipText: "Hide minor columns",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: () => {
          if (gridApi) setAllColumnGroupState(gridApi, false);
        },
      },
    ]);

  let buttonDefinitionColumnWidthHandler: PageWrapperContentFunctionBarButtonsDefinition[number] =
    $derived([
      {
        iconName: "fitToPageOutline",
        tooltipText: "Fit columns in frame",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: () => gridApi?.sizeColumnsToFit(),
      },
      {
        iconName: "tableColumnWidth",
        tooltipText: "Auto fit columns",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: () => {
          if (gridApi) setAutoColumnWidth(gridApi);
        },
      },
    ]);

  let buttonDefinitionReset: PageWrapperContentFunctionBarButtonsDefinition[number] =
    $derived([
      {
        iconName: "filterRemove",
        tooltipText: "Reset all filters",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: resetAllFilters,
      },
      {
        iconName: "refresh",
        tooltipText: "Reload",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: reload,
      },
    ]);

  let buttonDefinitionDownload: PageWrapperContentFunctionBarButtonsDefinition[number] =
    $derived([
      {
        iconName: "download",
        tooltipText: "Export as CSV",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: () => {
          openDialogExportCsv(dialogElement);
        },
      },
    ]);

  let buttonDefinitionFullScreen: PageWrapperContentFunctionBarButtonsDefinition[number] =
    $derived([
      {
        ...fullScreenButtonDefinition(isFullScreen),
        onClickEventFunction: () => {
          isFullScreen = !isFullScreen;
        },
      },
    ]);

  let buttonsDefinition: PageWrapperContentFunctionBarButtonsDefinition =
    $derived([
      buttonDefinitionShowHideColumns,
      buttonDefinitionColumnWidthHandler,
      buttonDefinitionReset,
      buttonDefinitionDownload,
      buttonDefinitionFullScreen,
    ]);
  function resetAllFilters(): void {
    // On the Infinite grid: a column filter makes setFilterModel(null) read
    // the rows again.
    const hadColumnFilter: boolean =
      infiniteRows !== undefined &&
      Object.keys(gridApi?.getFilterModel() ?? {}).length > 0;
    const hadQuickSearch: boolean =
      infiniteRows !== undefined && infiniteRows.quickSearch.text !== "";
    // Before the column filter changes, so that the worker does not search
    // with the old text for the rows that are thrown away.
    if (infiniteRows) infiniteRows.quickSearch.text = "";
    gridApi?.resetQuickFilter();
    gridApi?.setFilterModel(null);
    // Without a column filter, only this reads the rows without the text
    // cleared above: the quick search box does not for the same text.
    if (hadQuickSearch && !hadColumnFilter) {
      gridApi?.onFilterChanged();
    }
    quickSearchText = "";
  }
  function reload(): void {
    if (!gridApi) return;
    // Clear a shown no-rows overlay before showing the loading overlay.
    // While loading is true, the grid shows the loading overlay and does not
    // hide it.
    if (!gridApi.getGridOption("loading")) {
      gridApi.hideOverlay();
    }
    gridApi.setGridOption("loading", true);
    setTimeout(() => {
      // The grid may be gone by then, and ag-grid warns.
      if (!gridApi || gridApi.isDestroyed()) return;
      //reset filters
      resetAllFilters();
      //reset sort
      gridApi.applyColumnState({
        defaultState: { sort: null },
      });
      //reset column moving
      gridApi.resetColumnGroupState();
      gridApi.resetColumnState();
      //reload data
      // While the rows are still loading, keep loading. GridBody clears it
      // when they come.
      if (infiniteRows) {
        if (infiniteRows.datasource) {
          gridApi.setGridOption("loading", false);
          gridApi.purgeInfiniteCache();
          // The rows have no data until the datasource answers.
          setAutoColumnWidthWhenRowsCome(gridApi);
        }
      } else if (rows) {
        // While loading is true, the grid shows no other overlay.
        gridApi.setGridOption("loading", false);
        gridApi.setGridOption("rowData", rows);
        if (rows.length === 0) {
          gridApi.showNoRowsOverlay();
        }
        gridApi.refreshCells({ force: true });
        setAutoColumnWidth(gridApi);
      }
    }, 500);
  }
  let dialogElement: HTMLDialogElement | undefined = $state();
</script>

<ExportCsv {gridApi} bind:dialogElement {exportFilePrefix} {infiniteRows} />
<PageWrapperContentFunctionBar
  functionBarDefinition={{
    buttonsDefinition: buttonsDefinition,
    showThreeDotsButton: true,
    buttonSize: sizeSettings.gridFunctionButton,
    breakPointWidthForOpenedSidebar:
      breakPointWidthThresholds.gridFunctionButtonForOpenedSidebar,
    horizontalAlignment: "between",
  }}
  ><BaseGridFunctionBarQuickSearch
    bind:quickSearchText
    {gridApi}
    quickSearch={infiniteRows?.quickSearch}
  />
</PageWrapperContentFunctionBar>
