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
  import type { ColumnApi, GridOptions } from "ag-grid-community";
  import ExportCsv, { openDialogExportCsv } from "./ExportCsv/ExportCsv.svelte";

  export let gridOptions: GridOptions<GridRow>;
  export let rows: GridRow[];
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
      onClickEventFunction: () =>
        setAllColumnGroupState(gridOptions.columnApi!, true),
    },
    {
      iconName: "arrowCollapseHorizontal",
      tooltipText: "Hide minor columns",
      tooltipXPosition: "left",
      tooltipYPosition: "top",
      onClickEventFunction: () =>
        setAllColumnGroupState(gridOptions.columnApi!, false),
    },
  ];

  let buttonDefinitionColumnWidthHandler: PageWrapperContentFunctionBarButtonsDefinition[number];
  $: buttonDefinitionColumnWidthHandler = [
    {
      iconName: "fitToPageOutline",
      tooltipText: "Fit columns in frame",
      tooltipXPosition: "left",
      tooltipYPosition: "top",
      onClickEventFunction: () => gridOptions.api!.sizeColumnsToFit(),
    },
    {
      iconName: "tableColumnWidth",
      tooltipText: "Auto fit columns",
      tooltipXPosition: "left",
      tooltipYPosition: "top",
      onClickEventFunction: () => setAutoColumnWidth(gridOptions.columnApi!),
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
  function setAllColumnGroupState(columnApi: ColumnApi, open: boolean): void {
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
  function setAutoColumnWidth(
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
  function resetAllFilters(): void {
    if (gridOptions.api) {
      gridOptions.api.setFilterModel(null);
      gridOptions.api.setQuickFilter("");
    }
    quickSearchText = "";
  }
  async function reload(): Promise<void> {
    gridOptions.api!.showLoadingOverlay();
    await setTimeout(() => {
      //reset filters
      resetAllFilters();
      //reset sort
      gridOptions.columnApi!.applyColumnState({
        defaultState: { sort: null },
      });
      //reset column moving
      gridOptions.columnApi!.resetColumnGroupState();
      gridOptions.columnApi!.resetColumnState();
      //reload data
      gridOptions.api!.setRowData(rows);
      gridOptions.api!.refreshCells({ force: true });
    }, 500);
  }
  let dialogElement: HTMLDialogElement;
</script>

<ExportCsv {gridOptions} bind:dialogElement {exportFilePrefix} />
<PageWrapperContentFunctionBar
  functionBarDefinition={{
    buttonsDefinition: buttonsDefinition,
    showThreeDotsButton: true,
    buttonSize: sizeSettings.gridFunctionButton,
    breakPointWidthForOpendSidebar:
      breakPointWidthThresholds.grigFunctionButtonForOpenedSidebar,
    horizontalAlignment: "between",
  }}
  ><BaseGridFunctionBarQuickSearch bind:quickSearchText {gridOptions} />
</PageWrapperContentFunctionBar>
