<script lang="ts">
  import { page } from "$app/state";
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import type { PageWrapperContentFunctionBarDefinition } from "$lib/PageWrapper/PageWrapperContentFunctionBar.svelte";
  // Named apart from the snippet PageWrapperContentFunctionBar of PageWrapperContent.
  import PageWrapperContentFunctionBarComponent from "$lib/PageWrapper/PageWrapperContentFunctionBar.svelte";
  import { fullScreenButtonDefinition } from "$lib/PageWrapper/PageWrapperContentFunctionBarButtons.svelte";
  import { breakPointWidthThresholds } from "$lib/appearanceConfig/size/sizeDefinitions";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseHighlight from "$lib/base/BaseHighlight.svelte";
  import { showSnackBarAsCopied } from "$lib/common/CommonCopyButton.svelte";
  import { storeNoDbSnackBar } from "@stores/storeNoDb";
  import { ExportDataToFile, getExportFileName } from "@utils/utilsFile";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { getAbiText, type TargetAbi } from "./abiText";

  interface Props {
    targetAbi: TargetAbi;
    fragment?: boolean;
    isFullScreen: boolean;
  }

  let {
    targetAbi,
    fragment = false,
    isFullScreen = $bindable(),
  }: Props = $props();

  let abiFormatButtonIndex: number = $state(0);

  let isExpanded: boolean = $state(true);

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

  let buttonsDefinition: PageWrapperContentFunctionBarDefinition["buttonsDefinition"] =
    $derived([
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
                page.params,
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
    ]);
  let abiText = $derived(
    getAbiText(targetAbi, abiFormatButtonIndex, isExpanded),
  );
</script>

<PageWrapperContent>
  {#snippet PageWrapperContentFunctionBar()}
    <PageWrapperContentFunctionBarComponent
      functionBarDefinition={{
        buttonsDefinition: buttonsDefinition,
        showThreeDotsButton: false,
        buttonSize: sizeSettings.gridFunctionButton,
        breakPointWidthForOpendSidebar:
          breakPointWidthThresholds.grigFunctionButtonForOpenedSidebar,
        horizontalAlignment: "end",
      }}
    />
  {/snippet}
  {#snippet PageWrapperContentBody()}
    <BaseHighlight code={abiText} targetLanguageName="json" />
  {/snippet}
</PageWrapperContent>
