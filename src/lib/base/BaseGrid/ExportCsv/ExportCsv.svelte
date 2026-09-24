<script lang="ts" module>
  import { openDialog } from "$lib/base/BaseDialog/BaseDialogHandler";

  export function openDialogExportCsv(
    dialogElement: HTMLDialogElement | undefined,
  ) {
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
  // Named apart from the snippet PageWrapperContentFooter of PageWrapperContent.
  import PageWrapperContentFooterComponent, {
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

  interface Props {
    gridApi: GridApi<GridRow>;
    dialogElement?: HTMLDialogElement;
    exportFilePrefix: ExportFilePrefix;
  }

  let {
    gridApi,
    dialogElement = $bindable(),
    exportFilePrefix,
  }: Props = $props();

  const colorCategory: ColorCategory = colorSettings.dialogHeader;

  let gridId: string | undefined = $derived(gridApi?.getGridId());

  // In order to avoid duplicate inputIds, add gridId to inputId.
  // This duplication occurs when multiple grids appear on a single page (including in tags).
  const addGridIdToInputId = (id: string): string => {
    return `${id}${gridId ?? ""}`;
  };

  let exportCsvRadioProps: ExportCsvRadioProps = $derived({
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
  });

  let radioPropsKeys = $derived(
    Object.keys(exportCsvRadioProps ?? {}) as (keyof ExportCsvRadioProps)[],
  );

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
  {#snippet dialogBody()}
    <PageWrapperContent hasMultipulTabs={false} gridCols="grid-cols-1">
      {#snippet PageWrapperContentBody()}
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
                onchanged={(value) => {
                  // update selectedValue.
                  // I tried to updete it by using `bing:selectedValue={exportCsv...}`,
                  // but that did not work. I looked into it, but couldn't figure out why.
                  exportCsvRadioProps[key].selectedValue = value;
                }}
              />
            </CommonItemMember>
          {/each}
        </CommonItemGroup>
      {/snippet}
      {#snippet PageWrapperContentFooter()}
        <PageWrapperContentFooterComponent {footerDefinition} />
      {/snippet}
    </PageWrapperContent>
  {/snippet}
</BaseDialog>
