<script lang="ts" generics="GridRow">
  import BaseGridFunctionBarQuickSearch from "./BaseGridFunctionBarQuickSearch.svelte";

  import type { ExportFilePrefix } from "@utils/utilsFile";

  import { breakPointWidthThresholds } from "$lib/appearanceConfig/size/sizeDefinitions";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import PageWrapperContentFunctionBar from "$lib/PageWrapper/PageWrapperContentFunctionBar.svelte";
  import {
    fullScreenButtonDefinition,
    type PageWrapperContentFunctionBarButtonsDefinition,
  } from "$lib/PageWrapper/PageWrapperContentFunctionBarButtons.svelte";
  import type { GridApi } from "ag-grid-community";
  import ExportCsv, { openDialogExportCsv } from "./ExportCsv/ExportCsv.svelte";
  import { setAllColumnGroupState, setAutoColumnWidth } from "./gridColumns";

  interface Props {
    gridApi: GridApi<GridRow>;
    rows: GridRow[] | undefined;
    isFullScreen: boolean;
    exportFilePrefix: ExportFilePrefix;
  }

  let {
    gridApi,
    rows,
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
        onClickEventFunction: () => setAllColumnGroupState(gridApi, true),
      },
      {
        iconName: "arrowCollapseHorizontal",
        tooltipText: "Hide minor columns",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: () => setAllColumnGroupState(gridApi, false),
      },
    ]);

  let buttonDefinitionColumnWidthHandler: PageWrapperContentFunctionBarButtonsDefinition[number] =
    $derived([
      {
        iconName: "fitToPageOutline",
        tooltipText: "Fit columns in frame",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: () => gridApi.sizeColumnsToFit(),
      },
      {
        iconName: "tableColumnWidth",
        tooltipText: "Auto fit columns",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: () => setAutoColumnWidth(gridApi),
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
    gridApi.resetQuickFilter();
    quickSearchText = "";
  }
  function reload(): void {
    // Clear a shown no-rows overlay before showing the loading overlay.
    gridApi.hideOverlay();
    gridApi.setGridOption("loading", true);
    setTimeout(() => {
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
      // While loading is true, the grid shows no other overlay.
      gridApi.setGridOption("loading", false);
      if (rows) {
        gridApi.setGridOption("rowData", rows);
        if (rows.length === 0) {
          gridApi.showNoRowsOverlay();
        }
        gridApi.refreshCells({ force: true });
        setAutoColumnWidth(gridApi);
      } else {
        gridApi.showNoRowsOverlay();
      }
    }, 500);
  }
  let dialogElement: HTMLDialogElement | undefined = $state();
</script>

<ExportCsv {gridApi} bind:dialogElement {exportFilePrefix} />
<PageWrapperContentFunctionBar
  functionBarDefinition={{
    buttonsDefinition: buttonsDefinition,
    showThreeDotsButton: true,
    buttonSize: sizeSettings.gridFunctionButton,
    breakPointWidthForOpendSidebar:
      breakPointWidthThresholds.grigFunctionButtonForOpenedSidebar,
    horizontalAlignment: "between",
  }}
  ><BaseGridFunctionBarQuickSearch bind:quickSearchText {gridApi} />
</PageWrapperContentFunctionBar>
