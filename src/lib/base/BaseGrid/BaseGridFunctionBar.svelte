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

  export let gridApi: GridApi<GridRow>;
  export let rows: GridRow[] | undefined;
  export let isFullScreen: boolean;
  export let exportFilePrefix: ExportFilePrefix;

  let quickSearchText: string = "";

  let buttonDefinitionShowHideColumns: PageWrapperContentFunctionBarButtonsDefinition[number];
  $: buttonDefinitionShowHideColumns = [
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
  ];

  let buttonDefinitionColumnWidthHandler: PageWrapperContentFunctionBarButtonsDefinition[number];
  $: buttonDefinitionColumnWidthHandler = [
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
  ];

  let buttonDefinitionReset: PageWrapperContentFunctionBarButtonsDefinition[number];
  $: buttonDefinitionReset = [
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
  ];

  let buttonDefinitionDownload: PageWrapperContentFunctionBarButtonsDefinition[number];
  $: buttonDefinitionDownload = [
    {
      iconName: "download",
      tooltipText: "Export as CSV",
      tooltipXPosition: "left",
      tooltipYPosition: "top",
      onClickEventFunction: () => {
        openDialogExportCsv(dialogElement);
      },
    },
  ];

  let buttonDefinitionFullScreen: PageWrapperContentFunctionBarButtonsDefinition[number];
  $: buttonDefinitionFullScreen = [
    {
      ...fullScreenButtonDefinition(isFullScreen),
      onClickEventFunction: () => {
        isFullScreen = !isFullScreen;
      },
    },
  ];

  let buttonsDefinition: PageWrapperContentFunctionBarButtonsDefinition;
  $: buttonsDefinition = [
    buttonDefinitionShowHideColumns,
    buttonDefinitionColumnWidthHandler,
    buttonDefinitionReset,
    buttonDefinitionDownload,
    buttonDefinitionFullScreen,
  ];
  function setAllColumnGroupState(gridApi: GridApi, open: boolean): void {
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
  function setAutoColumnWidth(
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
  function resetAllFilters(): void {
    gridApi.resetQuickFilter();
    quickSearchText = "";
  }
  async function reload(): Promise<void> {
    gridApi.showLoadingOverlay();
    await setTimeout(() => {
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
      if (rows) {
        gridApi.setGridOption("rowData", rows);
        gridApi.refreshCells({ force: true });
        setAutoColumnWidth(gridApi);
      }
    }, 500);
  }
  let dialogElement: HTMLDialogElement;
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
