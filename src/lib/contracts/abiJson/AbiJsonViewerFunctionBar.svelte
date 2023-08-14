<script lang="ts">
  import { page } from "$app/stores";
  import CommonFunctionBar from "$lib/common/CommonFunctionBar/CommonFunctionBar.svelte";
  import CommonFunctionButtons, {
    type CommonFunctionButtonDefinition,
  } from "$lib/common/CommonFunctionBar/CommonFunctionButtons.svelte";
  import { ExportDataToFile, getExportFileName } from "@utils/utilsFile";
  export let titleCategoryLabelTextForFullScreen: string;
  export let titleText: string;
  export let isExpanded: boolean;
  export let isFullScreen: boolean;
  export let abiText: string;
  export let fragment: boolean;

  let buttonDefinitions: {
    textFormatter: CommonFunctionButtonDefinition[];
    copy: CommonFunctionButtonDefinition[];
    export: CommonFunctionButtonDefinition[];
    fullScreen: CommonFunctionButtonDefinition[];
  };
  $: buttonDefinitions = {
    textFormatter: [
      {
        iconName: isExpanded ? "arrowCollapseVertical" : "arrowExpandVertical",
        tooltipText: isExpanded ? "Unformatted" : "Formatted",
        onClickEventFunction: () => {
          isExpanded = !isExpanded;
        },
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
      },
    ],

    copy: [
      {
        iconName: "contentCopy",
        tooltipText: "Copy to clipboard",
        onClickEventFunction: () => navigator.clipboard.writeText(abiText),
        tooltipXPosition: "left",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
      },
    ],
    export: [
      {
        iconName: "download",
        tooltipText: "Export as JSON",
        onClickEventFunction: () =>
          ExportDataToFile(
            abiText,
            getExportFileName(
              fragment ? "ABIfragment" : "ABI",
              $page.params,
              "json"
            ),
            "json"
          ),
        tooltipXPosition: "left",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
      },
    ],
    fullScreen: [
      {
        iconName: isFullScreen ? "fullScreenExit" : "fullScreen",
        tooltipText: isFullScreen ? "Exit full screen" : "Full screen",
        onClickEventFunction: () => {
          isFullScreen = !isFullScreen;
        },
        tooltipXPosition: "left",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
      },
    ],
  };
</script>

<CommonFunctionBar
  {titleCategoryLabelTextForFullScreen}
  {titleText}
  justifyAlignment={isFullScreen ? "justify-between" : "justify-end"}
  {isFullScreen}
>
  <CommonFunctionButtons {buttonDefinitions} slot="buttons" />
</CommonFunctionBar>
