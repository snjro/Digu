<script lang="ts" context="module">
  export const fullScreenSimplifiedButtonDefinition = (
    isFullScreen: boolean,
  ): Omit<SimplifiedButtonDefinition, "onClickEventFunction"> => {
    return {
      iconName: isFullScreen ? "fullScreenExit" : "fullScreen",
      tooltipText: isFullScreen ? "Exit" : "Full screen",
      tooltipXPosition: "left",
      tooltipYPosition: isFullScreen ? "bottom" : "top",
    };
  };
</script>

<script lang="ts" generics="GridRow">
  import { breakPointWidthThresholds } from "$lib/appearanceConfig/size/sizeDefinitions";

  import { storeUserSettings } from "@stores/storeUserSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
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

  let buttonDefinitionShowHideColumns: SimplifiedButtonDefinition[];
  $: buttonDefinitionShowHideColumns = [
    {
      iconName: "arrowExpandHorizontal",
      tooltipText: "Show all columns",
      tooltipXPosition: isFullScreen ? "left" : "right",
      tooltipYPosition: isFullScreen ? "bottom" : "top",
      onClickEventFunction: () =>
        setAllColumnGroupState(gridOptions.columnApi!, true),
    },
    {
      iconName: "arrowCollapseHorizontal",
      tooltipText: "Hide minor columns",
      tooltipXPosition: isFullScreen ? "left" : "right",
      tooltipYPosition: isFullScreen ? "bottom" : "top",
      onClickEventFunction: () =>
        setAllColumnGroupState(gridOptions.columnApi!, false),
    },
  ];

  let buttonDefinitionColumnWidthHandler: SimplifiedButtonDefinition[];
  $: buttonDefinitionColumnWidthHandler = [
    {
      iconName: "fitToPageOutline",
      tooltipText: "Fit columns in frame",
      tooltipXPosition: isFullScreen ? "left" : "right",
      tooltipYPosition: isFullScreen ? "bottom" : "top",
      onClickEventFunction: () => gridOptions.api!.sizeColumnsToFit(),
    },
    {
      iconName: "tableColumnWidth",
      tooltipText: "Auto fit columns",
      tooltipXPosition: isFullScreen ? "left" : "right",
      tooltipYPosition: isFullScreen ? "bottom" : "top",
      onClickEventFunction: () => setAutoColumnWidth(gridOptions.columnApi!),
    },
  ];

  let buttonDefinitionReset: SimplifiedButtonDefinition[];
  $: buttonDefinitionReset = [
    {
      iconName: "filterRemove",
      tooltipText: "Reset all filters",
      tooltipXPosition: isFullScreen ? "left" : "right",
      tooltipYPosition: isFullScreen ? "bottom" : "top",
      onClickEventFunction: resetAllFilters,
    },
    {
      iconName: "refresh",
      tooltipText: "Reload",
      tooltipXPosition: isFullScreen ? "left" : "right",
      tooltipYPosition: isFullScreen ? "bottom" : "top",
      onClickEventFunction: reload,
    },
  ];

  let buttonDefinitionDownload: SimplifiedButtonDefinition[];
  $: buttonDefinitionDownload = [
    {
      iconName: "download",
      tooltipText: "Export as CSV",
      tooltipXPosition: "left",
      tooltipYPosition: isFullScreen ? "bottom" : "top",
      onClickEventFunction: () => {
        openDialogExportCsv(dialogElement);
      },
    },
  ];

  let buttonDefinitionFullScreen: SimplifiedButtonDefinition[];
  $: buttonDefinitionFullScreen = [
    {
      ...fullScreenSimplifiedButtonDefinition(isFullScreen),
      onClickEventFunction: () => {
        isFullScreen = !isFullScreen;
      },
    },
  ];

  let buttonDefinitions: Array<SimplifiedButtonDefinition[]>;
  $: buttonDefinitions = [
    buttonDefinitionShowHideColumns,
    buttonDefinitionColumnWidthHandler,
    buttonDefinitionReset,
    buttonDefinitionDownload,
    buttonDefinitionFullScreen,
  ];
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
<CommonFunctionButtons
  {buttonDefinitions}
  isOpenSidebar={isFullScreen ? false : $storeUserSettings.isOpenSidebar}
  buttonSize={sizeSettings.gridFunctionButton}
  breakPointWidthForOpendSidebar={breakPointWidthThresholds.grigFunctionButtonForOpenedSidebar}
/>
