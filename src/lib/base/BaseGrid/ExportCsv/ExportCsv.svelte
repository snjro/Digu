<script lang="ts" context="module">
  import { openDialog } from "$lib/base/BaseDialog/BaseDialogHandler";

  export function openDialogExportCsv(dialogElement: HTMLDialogElement) {
    openDialog(dialogElement);
  }
  type ExportCsvRadioProp<RadioValue> = {
    title: string;
    subTitle: string;
    groupName: string;
    selectedValue: RadioValue;
    radioLabelAndValues: RadioLabelAndValues<RadioValue>;
  };

  export type ExportCsvRadioProps = {
    skipRowNumber: ExportCsvRadioProp<boolean>;
    columnSeparator: ExportCsvRadioProp<CsvColumnSeparator>;
    suppressDoubleQuotes: ExportCsvRadioProp<boolean>;
    skipColumnHeaders: ExportCsvRadioProp<boolean>;
    filteredSorted: ExportCsvRadioProp<CsvFilteredSorted>;
  };
</script>

<script lang="ts" generics="GridRow">
  import { page } from "$app/stores";
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import PageWrapperContentFooter, {
    type PageWrapperContentFooterDefinition,
  } from "$lib/PageWrapper/PageWrapperContentFooter.svelte";
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseDialog from "$lib/base/BaseDialog/BaseDialog.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import BaseRadio, {
    type RadioLabelAndValues,
  } from "$lib/base/BaseRadio.svelte";
  import { showSnackBarAsCopied } from "$lib/common/CommonCopyButton.svelte";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import { storeNoDbSnackBar } from "@stores/storeNoDb";
  import { getExportFileName, type ExportFilePrefix } from "@utils/utilsFile";
  import type { GridApi } from "ag-grid-community";
  import {
    exportCsvFile,
    type CsvColumnSeparator,
    type CsvFilteredSorted,
  } from "./exportCsv";

  export let gridApi: GridApi<GridRow>;
  export let dialogElement: HTMLDialogElement;
  export let exportFilePrefix: ExportFilePrefix;

  const colorCategory: ColorCategory = colorSettings.dialogHeader;

  let gridId: string | undefined = undefined;
  $: gridId = gridApi?.getGridId();

  // In order to avoid duplicate inputIds, add gridId to inputId.
  // This duplication occurs when multiple grids appear on a single page (including in tags).
  $: addGridIdToInputId = (id: string): string => {
    return `${id}${gridId ?? ""}`;
  };

  let exportCsvRadioProps: ExportCsvRadioProps;
  $: exportCsvRadioProps = {
    skipRowNumber: {
      title: "Row number",
      subTitle: "Include the row number which is the first column?",
      groupName: "includeRowNumber",
      selectedValue: false,
      radioLabelAndValues: [
        {
          labelText: "Yes",
          value: false,
          inputId: addGridIdToInputId("includeRowNumberYes"),
        },
        {
          labelText: "No",
          value: true,
          inputId: addGridIdToInputId("includeRowNumberNo"),
        },
      ],
    },
    columnSeparator: {
      title: "Column separator",
      subTitle: "Which character is used as a column separator?",
      groupName: "columnSeparator",
      selectedValue: ",",
      radioLabelAndValues: [
        {
          labelText: `Comma`,
          value: ",",
          inputId: addGridIdToInputId("columnSeparatorComma"),
        },
        {
          labelText: `Tab`,
          value: `\t`,
          inputId: addGridIdToInputId("columnSeparatorTab"),
        },
        {
          labelText: `Bar "|"`,
          value: `|`,
          inputId: addGridIdToInputId("columnSeparatorBar"),
        },
      ],
    },
    suppressDoubleQuotes: {
      title: "Double quotes",
      subTitle: "Wrap values in double quotes?",
      groupName: "WrapDoubleQuotes",
      selectedValue: false,
      radioLabelAndValues: [
        {
          labelText: "Yes",
          value: false,
          inputId: addGridIdToInputId("wrapDoubleQuotesYes"),
        },
        {
          labelText: "No",
          value: true,
          inputId: addGridIdToInputId("wrapDoubleQuotesNo"),
        },
      ],
    },
    skipColumnHeaders: {
      title: "Column headers",
      subTitle: "Include column headers?",
      groupName: "ExportColumnHeaders",
      selectedValue: false,
      radioLabelAndValues: [
        {
          labelText: "Yes",
          value: false,
          inputId: addGridIdToInputId("exportColumnHeadersYes"),
        },
        {
          labelText: "No",
          value: true,
          inputId: addGridIdToInputId("exportColumnHeadersNo"),
        },
      ],
    },
    filteredSorted: {
      title: "Filtered & Sorted",
      subTitle: "Export all data or filtered and sorted data?",
      groupName: "FilteredAndSorted",
      selectedValue: "all",
      radioLabelAndValues: [
        {
          labelText: "All",
          value: "all",
          inputId: addGridIdToInputId("filteredAndSortedNo"),
        },
        {
          labelText: "Filtered & Sorted",
          value: "filteredAndSorted",
          inputId: addGridIdToInputId("filteredAndSortedYes"),
        },
      ],
    },
  };

  $: radioPropsKeys = Object.keys(
    exportCsvRadioProps ?? {},
  ) as (keyof ExportCsvRadioProps)[];

  function downloadCsvFile(): void {
    exportCsvFile(
      gridApi,
      exportCsvRadioProps.skipRowNumber.selectedValue,
      exportCsvRadioProps.columnSeparator.selectedValue,
      exportCsvRadioProps.suppressDoubleQuotes.selectedValue,
      exportCsvRadioProps.filteredSorted.selectedValue,
      exportCsvRadioProps.skipColumnHeaders.selectedValue,
      getExportFileName(exportFilePrefix, $page.params, "csv"),
    );
  }
  function copyToClipboard(): void {
    const csvData: string = exportCsvFile(
      gridApi,
      exportCsvRadioProps.skipRowNumber.selectedValue,
      exportCsvRadioProps.columnSeparator.selectedValue,
      exportCsvRadioProps.suppressDoubleQuotes.selectedValue,
      exportCsvRadioProps.filteredSorted.selectedValue,
      exportCsvRadioProps.skipColumnHeaders.selectedValue,
    ) as string;
    navigator.clipboard.writeText(csvData);
    $storeNoDbSnackBar = showSnackBarAsCopied;
  }

  let footerDefinition: PageWrapperContentFooterDefinition = {
    buttonsDefinition: [
      {
        iconName: "download",
        tooltipText: "Export",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: downloadCsvFile,
      },
      {
        iconName: "contentCopy",
        tooltipText: "Copy",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: copyToClipboard,
      },
    ],
    buttonSize: sizeSettings.dialogFooter,
    horizontalAlignment: "end",
  };
</script>

<BaseDialog bind:dialogElement headerText="Export CSV File">
  <PageWrapperContent
    hasMultipulTabs={false}
    gridCols="grid-cols-1"
    slot="dialogBody"
  >
    <svelte:fragment slot="PageWrapperContentBody">
      <CommonItemGroup text="CSV File Format" gridTrack="col-span-full">
        {#each radioPropsKeys as key}
          <CommonItemMember text={exportCsvRadioProps[key].title}>
            <BaseLabel
              textSize={sizeSettings.dialogBodyContent}
              text={exportCsvRadioProps[key].subTitle}
              colorCategoryFront={colorCategory}
            />
            <BaseRadio
              radioButtonType="button"
              border
              size={sizeSettings.dialogBodyContent}
              labelAndValues={exportCsvRadioProps[key].radioLabelAndValues}
              groupName={exportCsvRadioProps[key].groupName}
              selectedValue={exportCsvRadioProps[key].selectedValue}
              on:changed={(event) => {
                // update selectedValue.
                // I tried to updete it by using `bing:selectedValue={exportCsv...}`,
                // but that did not work. I looked into it, but couldn't figure out why.
                exportCsvRadioProps[key].selectedValue = event.detail;
              }}
            />
          </CommonItemMember>
        {/each}
      </CommonItemGroup>
    </svelte:fragment>
    <PageWrapperContentFooter
      {footerDefinition}
      slot="PageWrapperContentFooter"
    />
  </PageWrapperContent>
</BaseDialog>
