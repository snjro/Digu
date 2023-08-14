<script lang="ts" generics="GridRow">
  import type { SimplifiedButtonDefinition } from "$lib/base/BaseButtonIcon.svelte";
  import type { ExportFilePrefix } from "@utils/utilsFile";
  import CommonFunctionButtons from "$lib/common/CommonFunctionBar/CommonFunctionButtons.svelte";
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
  let buttonDefinitions: Record<string, SimplifiedButtonDefinition[]>;
  $: buttonDefinitions = {
    groupColumnHandler: [
      {
        iconName: "arrowExpandHorizontal",
        tooltipText: "Show all columns",
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
        onClickEventFunction: () =>
          setAllColumnGroupState(gridOptions.columnApi!, true),
      } as SimplifiedButtonDefinition,
      {
        iconName: "arrowCollapseHorizontal",
        tooltipText: "Hide minor columns",
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
        onClickEventFunction: () =>
          setAllColumnGroupState(gridOptions.columnApi!, false),
      } as SimplifiedButtonDefinition,
    ],
    columnWidthHandler: [
      {
        iconName: "fitToPageOutline",
        tooltipText: "Fit columns in frame",
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
        onClickEventFunction: () => gridOptions.api!.sizeColumnsToFit(),
      } as SimplifiedButtonDefinition,
      {
        iconName: "tableColumnWidth",
        tooltipText: "Auto fit columns",
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
        onClickEventFunction: () => setAutoColumnWidth(gridOptions.columnApi!),
      } as SimplifiedButtonDefinition,
    ],
    reset: [
      {
        iconName: "filterRemove",
        tooltipText: "Reset all filters",
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
        onClickEventFunction: resetAllFilters,
      } as SimplifiedButtonDefinition,
      {
        iconName: "refresh",
        tooltipText: "Reload",
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
        onClickEventFunction: reload,
      } as SimplifiedButtonDefinition,
      {
        iconName: "download",
        tooltipText: "Export as CSV",
        tooltipXPosition: "left",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
        onClickEventFunction: () => {
          openDialogExportCsv(dialogElement);
        },
      } as SimplifiedButtonDefinition,
    ],
    fullScreen: [
      {
        iconName: isFullScreen ? "fullScreenExit" : "fullScreen",
        tooltipText: isFullScreen ? "Exit full screen" : "Full screen",
        tooltipXPosition: "left",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
        onClickEventFunction: () => {
          isFullScreen = !isFullScreen;
        },
      } as SimplifiedButtonDefinition,
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
<CommonFunctionButtons {buttonDefinitions} {isFullScreen} />
