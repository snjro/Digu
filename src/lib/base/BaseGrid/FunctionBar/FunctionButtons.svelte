<script lang="ts" generics="GridRow">
  import type { ExportFilePrefix } from "@utils/utilsFile";
  import CommonFunctionButtons, {
    type CommonFunctionButtonDefinition,
  } from "$lib/common/CommonFunctionBar/CommonFunctionButtons.svelte";
  import type { GridOptions } from "ag-grid-community";
  // import classNames from "classnames";
  import {
    setAllColumnGroupState,
    setAutoColumnWidth,
  } from "../GridBody/GridBody.svelte";
  import DialogExportCsv, {
    openDialogExportCsv,
  } from "./DialogExportCsv.svelte";

  export let gridOptions: GridOptions<GridRow>;
  export let rows: GridRow[];
  export let isFullScreen: boolean;
  export let quickSearchText: string;
  export let exportFilePrefix: ExportFilePrefix;
  $: buttonDefinitions = {
    groupColumnHandler: [
      {
        iconName: "arrowExpandHorizontal",
        tooltipText: "Show all columns",
        onClickEventFunction: () =>
          setAllColumnGroupState(gridOptions.columnApi!, true),
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
      } as CommonFunctionButtonDefinition,
      {
        iconName: "arrowCollapseHorizontal",
        tooltipText: "hide minor columns",
        onClickEventFunction: () =>
          setAllColumnGroupState(gridOptions.columnApi!, false),
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
      } as CommonFunctionButtonDefinition,
    ],
    columnWidthHandler: [
      {
        iconName: "fitToPageOutline",
        tooltipText: "Fit columns in frame",
        onClickEventFunction: () => gridOptions.api!.sizeColumnsToFit(),
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
      } as CommonFunctionButtonDefinition,
      {
        iconName: "tableColumnWidth",
        tooltipText: "Auto fit columns",
        onClickEventFunction: () => setAutoColumnWidth(gridOptions.columnApi!),
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
      } as CommonFunctionButtonDefinition,
    ],
    reset: [
      {
        iconName: "filterRemove",
        tooltipText: "Reset all filters",
        onClickEventFunction: resetAllFilters,
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
      } as CommonFunctionButtonDefinition,
      {
        iconName: "refresh",
        tooltipText: "Reload",
        onClickEventFunction: reload,
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
      } as CommonFunctionButtonDefinition,
      {
        iconName: "download",
        tooltipText: "Export CSV",
        onClickEventFunction: () => {
          openDialogExportCsv(dialogElement);
        },

        tooltipXPosition: "left",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
      } as CommonFunctionButtonDefinition,
    ],
    fullScreen: [
      {
        iconName: isFullScreen ? "fullScreenExit" : "fullScreen",
        tooltipText: isFullScreen ? "Windowed " : "Full screen",
        onClickEventFunction: () => {
          isFullScreen = !isFullScreen;
        },
        tooltipXPosition: "left",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
      } as CommonFunctionButtonDefinition,
    ],
  };
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

<DialogExportCsv {gridOptions} bind:dialogElement {exportFilePrefix} />
<CommonFunctionButtons {buttonDefinitions} />
