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
  import { copyTextToClipboard } from "$lib/common/clipboard";
  import { storeNoDbSnackBar } from "@stores/storeNoDb";
  import { ExportDataToFile, getExportFileName } from "@utils/utilsFile";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import type { AbiFormatType } from "@utils/utilsEthers";
  import {
    getAbiExportTooltipText,
    getAbiFileExtension,
    getAbiText,
    type TargetAbi,
  } from "./abiText";

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
    abiFormat: AbiFormatType;
    iconName: BaseIconProps["name"];
    tooltipText: string;
  }[] = [
    { abiFormat: "json", iconName: "codeJson", tooltipText: "JSON" },
    {
      abiFormat: "full",
      iconName: "textLong",
      tooltipText: "Human readable (full)",
    },
    {
      abiFormat: "minimal",
      iconName: "textShort",
      tooltipText: "Human readable (minimal)",
    },
  ];
  let abiFormat: AbiFormatType = $derived(
    abiFormatButtonDefinitions[abiFormatButtonIndex].abiFormat,
  );
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
          onClickEventFunction: async () => {
            $storeNoDbSnackBar = await copyTextToClipboard(abiText);
          },
        },
        {
          iconName: "download",
          tooltipText: getAbiExportTooltipText(abiFormat),
          tooltipXPosition: "left",
          tooltipYPosition: "top",
          onClickEventFunction: () =>
            ExportDataToFile(
              abiText,
              getExportFileName(
                fragment ? "ABIfragment" : "ABI",
                page.params,
                getAbiFileExtension(abiFormat),
              ),
              getAbiFileExtension(abiFormat),
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
  let abiText = $derived(getAbiText(targetAbi, abiFormat, isExpanded));
</script>

<PageWrapperContent scrollAreaLabel="ABI JSON">
  {#snippet PageWrapperContentFunctionBar()}
    <PageWrapperContentFunctionBarComponent
      functionBarDefinition={{
        buttonsDefinition: buttonsDefinition,
        showThreeDotsButton: false,
        buttonSize: sizeSettings.gridFunctionButton,
        breakPointWidthForOpenedSidebar:
          breakPointWidthThresholds.gridFunctionButtonForOpenedSidebar,
        horizontalAlignment: "end",
      }}
    />
  {/snippet}
  {#snippet PageWrapperContentBody()}
    <BaseHighlight code={abiText} targetLanguageName="json" />
  {/snippet}
</PageWrapperContent>
