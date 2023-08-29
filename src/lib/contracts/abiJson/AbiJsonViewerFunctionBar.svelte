<script lang="ts">
  import { page } from "$app/stores";
  import { breakPointWidthThresholds } from "$lib/appearanceConfig/size/sizeDefinitions";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { SimplifiedButtonDefinition } from "$lib/base/BaseButtonIcon.svelte";
  import { fullScreenSimplifiedButtonDefinition } from "$lib/base/BaseGrid/FunctionBar/FunctionButtons.svelte";
  import CommonFunctionBar from "$lib/common/CommonFunctionBar/CommonFunctionBar.svelte";
  import CommonFunctionButtons from "$lib/common/CommonFunctionBar/CommonFunctionButtons.svelte";
  import { ExportDataToFile, getExportFileName } from "@utils/utilsFile";

  export let titleCategoryLabelTextForFullScreen: string;
  export let titleText: string;
  export let isExpanded: boolean;
  export let isFullScreen: boolean;
  export let abiText: string;
  export let fragment: boolean;

  let buttonDefinitions: Array<SimplifiedButtonDefinition[]>;
  $: buttonDefinitions = [
    [
      {
        iconName: isExpanded ? "arrowCollapseVertical" : "arrowExpandVertical",
        tooltipText: isExpanded ? "Unformatted" : "Formatted",
        tooltipXPosition: isFullScreen ? "left" : "right",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
        onClickEventFunction: () => {
          isExpanded = !isExpanded;
        },
      },
      {
        iconName: "contentCopy",
        tooltipText: "Copy to clipboard",
        tooltipXPosition: "left",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
        onClickEventFunction: () => navigator.clipboard.writeText(abiText),
      },
      {
        iconName: "download",
        tooltipText: "Export as JSON",
        tooltipXPosition: "left",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
        onClickEventFunction: () =>
          ExportDataToFile(
            abiText,
            getExportFileName(
              fragment ? "ABIfragment" : "ABI",
              $page.params,
              "json",
            ),
            "json",
          ),
      },
      {
        ...fullScreenSimplifiedButtonDefinition(isFullScreen),
        onClickEventFunction: () => {
          isFullScreen = !isFullScreen;
        },
      },
    ],
  ];
</script>

<CommonFunctionBar
  {titleCategoryLabelTextForFullScreen}
  {titleText}
  justifyAlignment={isFullScreen ? "justify-between" : "justify-end"}
  {isFullScreen}
>
  <CommonFunctionButtons
    {buttonDefinitions}
    responsive={false}
    slot="buttons"
    buttonSize={sizeSettings.gridFunctionButton}
    breakPointWidthForOpendSidebar={breakPointWidthThresholds.grigFunctionButtonForOpenedSidebar}
  />
</CommonFunctionBar>
