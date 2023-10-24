<script lang="ts">
  import type {
    ContractInterface,
    EventAbiFragment,
    FunctionAbiFragment,
  } from "@constants/chains/types";

  import { page } from "$app/stores";
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import type { PageWrapperContentFunctionBarDefinition } from "$lib/PageWrapper/PageWrapperContentFunctionBar.svelte";
  import PageWrapperContentFunctionBar from "$lib/PageWrapper/PageWrapperContentFunctionBar.svelte";
  import { fullScreenButtonDefinition } from "$lib/PageWrapper/PageWrapperContentFunctionBarButtons.svelte";
  import { breakPointWidthThresholds } from "$lib/appearanceConfig/size/sizeDefinitions";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseHighlight from "$lib/base/BaseHighlight.svelte";
  import { showSnackBarAsCopied } from "$lib/common/CommonCopyButton.svelte";
  import { storeNoDbSnackBar } from "@stores/storeNoDb";
  import { jsonStringifyFormatted } from "@utils/utilsCommon";
  import { ExportDataToFile, getExportFileName } from "@utils/utilsFile";
  import type { BaseIconProps } from "$lib/base/BaseIcon";

  export let targetAbi: TargetAbi;
  export let fragment: boolean = false;
  export let isFullScreen: boolean;

  type TargetAbi = ContractInterface | EventAbiFragment | FunctionAbiFragment;

  let abiFormatButtonIndex: number = 0;

  $: targetFragment = () => {
    switch (abiFormatButtonIndex) {
      case 0: // JSON
        return isTargetContractInterface(targetAbi)
          ? targetAbi.fragments
          : targetAbi;
      case 1: // Human readable full
        return isTargetContractInterface(targetAbi)
          ? targetAbi.format(false)
          : targetAbi.format("full");
      default: // Human readable minimal
        return isTargetContractInterface(targetAbi)
          ? targetAbi.format(true)
          : targetAbi.format("minimal");
    }
  };

  let isExpanded: boolean = true;
  $: abiText = isExpanded
    ? jsonStringifyFormatted(targetFragment())
    : jsonStringifyFormatted(targetFragment(), 0);

  const expandButtonClicked: () => void = () => {
    isExpanded = !isExpanded;
  };

  const abiFormatButtonDefinitions: {
    iconName: BaseIconProps["name"];
    tooltipText: string;
  }[] = [
    { iconName: "codeJson", tooltipText: "Json" },
    { iconName: "textLong", tooltipText: "Human readable (full)" },
    { iconName: "textShort", tooltipText: "Human readable (minimal)" },
  ];
  const changeFormatButtonClicked: () => void = () => {
    abiFormatButtonIndex =
      (abiFormatButtonIndex + 1) % abiFormatButtonDefinitions.length;
  };

  let buttonsDefinition: PageWrapperContentFunctionBarDefinition["buttonsDefinition"];
  $: buttonsDefinition = [
    [
      {
        iconName: abiFormatButtonDefinitions[abiFormatButtonIndex].iconName,
        tooltipText:
          abiFormatButtonDefinitions[abiFormatButtonIndex].tooltipText,
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: changeFormatButtonClicked,
      },

      {
        iconName: isExpanded ? "textWrap" : "textWrapOff",
        tooltipText: isExpanded ? "With line breaks" : "No line breaks",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: expandButtonClicked,
      },
      {
        iconName: "contentCopy",
        tooltipText: "Copy to clipboard",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: () => {
          navigator.clipboard.writeText(abiText);
          $storeNoDbSnackBar = showSnackBarAsCopied;
        },
      },
      {
        iconName: "download",
        tooltipText: "Export as JSON",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: () =>
          ExportDataToFile(
            abiText,
            getExportFileName(
              fragment ? "ABIfragment" : "ABI",
              $page.params,
              abiFormatButtonIndex === 0 ? "json" : "txt",
            ),
            "json",
          ),
      },
      {
        ...fullScreenButtonDefinition(isFullScreen),
        onClickEventFunction: () => {
          isFullScreen = !isFullScreen;
        },
      },
    ],
  ];
  function isTargetContractInterface(
    targetAbi: TargetAbi,
  ): targetAbi is ContractInterface {
    return Object.prototype.hasOwnProperty.call(targetAbi, "fragments");
  }
</script>

<PageWrapperContent>
  <PageWrapperContentFunctionBar
    slot="PageWrapperContentFunctionBar"
    functionBarDefinition={{
      buttonsDefinition: buttonsDefinition,
      showThreeDotsButton: false,
      buttonSize: sizeSettings.gridFunctionButton,
      breakPointWidthForOpendSidebar:
        breakPointWidthThresholds.grigFunctionButtonForOpenedSidebar,
      horizontalAlignment: "end",
    }}
  />
  <BaseHighlight
    slot="PageWrapperContentBody"
    code={abiText}
    targetLanguageName="json"
  />
</PageWrapperContent>
