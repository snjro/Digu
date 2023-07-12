<script lang="ts">
  import { page } from "$app/stores";
  import CommonFunctionBar from "$lib/common/CommonFunctionBar/CommonFunctionBar.svelte";
  import CommonFunctionButtons, {
    type CommonFunctionButtonDefinition,
  } from "$lib/common/CommonFunctionBar/CommonFunctionButtons.svelte";
  import type { ChainName, ContractName } from "@constants/chains/types";
  import { downloadDataToFile } from "@utils/utilsFile";
  export let titleCategoryLabelText: string;
  export let titleText: string;
  export let isExpanded: boolean;
  export let isFullScreen: boolean;
  export let abiText: string;

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
        tooltipText: "Export ABI",
        onClickEventFunction: () =>
          downloadDataToFile(abiText, getAbiFileName(), "json"),
        tooltipXPosition: "left",
        tooltipYPosition: isFullScreen ? "bottom" : "top",
      },
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
      },
    ],
  };
  function getAbiFileName(): string {
    const chainName: ChainName = $page.params.chainName;
    const projectVersionName: string = $page.params.projectName_versionName;
    const contractName: ContractName = $page.params.contractName;
    const abiFileName: string = `ABI-${chainName}-${projectVersionName}-${contractName}`;
    return abiFileName;
  }
</script>

<CommonFunctionBar
  {titleCategoryLabelText}
  {titleText}
  justifyAlignment={isFullScreen ? "justify-between" : "justify-end"}
  {isFullScreen}
  isVerticalTitle={false}
>
  <CommonFunctionButtons {buttonDefinitions} />
</CommonFunctionBar>
