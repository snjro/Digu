<script lang="ts" context="module">
  export type TargetAbi =
    | ContractInterface
    | EventAbiFragment
    | FunctionAbiFragment;

  export function isTargetContractInterface(
    targetAbi: TargetAbi,
  ): targetAbi is ContractInterface {
    return Object.prototype.hasOwnProperty.call(targetAbi, "fragments");
  }
</script>

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
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { showSnackBarAsCopied } from "$lib/common/CommonCopyButton.svelte";
  import { storeNoDbSnackBar } from "@stores/storeNoDb";
  import { jsonStringifyFormatted } from "@utils/utilsCommon";
  import type { AbiFormatType } from "@utils/utilsEthers";
  import { ExportDataToFile, getExportFileName } from "@utils/utilsFile";

  export let targetAbi: TargetAbi;
  export let abiFormatType: AbiFormatType;
  export let fragment: boolean = false;
  export let isFullScreen: boolean;

  let formattedAbi: () => string[] | string;
  formattedAbi = (): string[] | string => {
    if (isTargetContractInterface(targetAbi)) {
      if (abiFormatType === "json") {
        return targetAbi.formatJson();
      } else {
        return targetAbi.format(abiFormatType === "minimal");
      }
    } else {
      if (abiFormatType === "json") {
        return targetAbi.format(abiFormatType);
      } else {
        return [targetAbi.format(abiFormatType)];
      }
    }
  };

  let isExpanded: boolean = true;
  let abiText: string = jsonStringifyFormatted(formattedAbi());

  const expandBottunClicked: () => void = () => {
    isExpanded = !isExpanded;
    abiText = isExpanded
      ? jsonStringifyFormatted(formattedAbi())
      : formattedAbi().toString();
  };
  let expandButtonIconName: BaseIconProps["name"];
  $: expandButtonIconName = isExpanded
    ? "arrowCollapseVertical"
    : "arrowExpandVertical";
  let expandButtonTooltipText: string;
  $: expandButtonTooltipText = isExpanded ? "Unformatted" : "Formatted";

  let buttonsDefinition: PageWrapperContentFunctionBarDefinition["buttonsDefinition"];
  $: buttonsDefinition = [
    [
      {
        iconName: expandButtonIconName,
        tooltipText: expandButtonTooltipText,
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: expandBottunClicked,
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
              "json",
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
