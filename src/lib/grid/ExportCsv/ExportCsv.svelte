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
    radioLabelAndValues: RadioLabelAndValues<RadioValue>;
  };

  // Built from CsvSelectedValues, so that the keys and value types stay the same.
  export type ExportCsvRadioProps = {
    [Key in keyof CsvSelectedValues]: ExportCsvRadioProp<
      CsvSelectedValues[Key]["selectedValue"]
    >;
  };
</script>

<script lang="ts" generics="GridRow">
  import { page } from "$app/state";
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
  import { copyTextToClipboard } from "$lib/common/clipboard";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import { storeNoDbSnackBar } from "@stores/storeNoDb";
  import { getExportFileName, type ExportFilePrefix } from "@utils/utilsFile";
  import type { GridApi } from "ag-grid-community";
  import {
    downloadCsvFile,
    getCsvText,
    type CsvSelectedValues,
  } from "./exportCsv";

  interface Props {
    gridApi: GridApi<GridRow> | undefined;
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

  // Kept apart from the derived props, which lose any change when rebuilt.
  let selectedValues: CsvSelectedValues = $state({
    skipRowNumber: { selectedValue: false },
    columnSeparator: { selectedValue: "," },
    suppressDoubleQuotes: { selectedValue: false },
    skipColumnHeaders: { selectedValue: false },
    filteredSorted: { selectedValue: "all" },
  });

  let exportCsvRadioProps: ExportCsvRadioProps = $derived({
    skipRowNumber: {
      title: "Row number",
      subTitle: "Include the row number which is the first column?",
      groupName: "includeRowNumber",
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
      subTitle:
        "Export all rows and columns, or only the shown ones in the shown order?",
      groupName: "FilteredAndSorted",
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

  function downloadCsv(): void {
    if (!gridApi) return;
    downloadCsvFile(
      gridApi,
      selectedValues,
      getExportFileName(exportFilePrefix, page.params, "csv"),
    );
  }
  async function copyToClipboard(): Promise<void> {
    if (!gridApi) return;
    const csvData: string = getCsvText(gridApi, selectedValues);
    $storeNoDbSnackBar = await copyTextToClipboard(csvData);
  }

  let footerDefinition: PageWrapperContentFooterDefinition = {
    buttonsDefinition: [
      {
        iconName: "download",
        tooltipText: "Export",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: downloadCsv,
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
    <PageWrapperContent hasMultipleTabs={false} gridCols="grid-cols-1">
      {#snippet PageWrapperContentBody()}
        <CommonItemGroup text="CSV File Format" gridTrack="col-span-full">
          {#each radioPropsKeys as key (key)}
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
                bind:selectedValue={selectedValues[key].selectedValue}
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
