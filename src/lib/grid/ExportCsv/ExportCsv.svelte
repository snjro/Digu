<script lang="ts" module>
  import { openDialog } from "#lib/base/BaseDialog/BaseDialogHandler.js";

  export const MESSAGE_MAKING_CSV: string = "Making the CSV…";

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
  import PageWrapperContent from "#lib/PageWrapper/PageWrapperContent.svelte";
  // Named apart from the snippet PageWrapperContentFooter of PageWrapperContent.
  import PageWrapperContentFooterComponent, {
    type PageWrapperContentFooterDefinition,
  } from "#lib/PageWrapper/PageWrapperContentFooter.svelte";
  import type { ColorCategory } from "#lib/appearanceConfig/color/colorDefinitions.js";
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseDialog from "#lib/base/BaseDialog/BaseDialog.svelte";
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import BaseRadio, {
    type RadioLabelAndValues,
  } from "#lib/base/BaseRadio.svelte";
  import {
    copyBlobToClipboard,
    copyTextToClipboard,
    showSnackBarAsCopied,
  } from "#lib/common/clipboard.js";
  import CommonItemGroup from "#lib/common/CommonItemGroup.svelte";
  import CommonItemMember from "#lib/common/CommonItemMember.svelte";
  import type { BaseSnackbarProps } from "#lib/base/snackbarProps.js";
  import { storeNoDbSnackBar } from "#stores/storeNoDb.js";
  import { customLogger } from "#utils/logger.js";
  import { numberWithCommas } from "#utils/utilsCommon.js";
  import {
    exportBlobToFile,
    getExportFileName,
    type ExportFilePrefix,
  } from "#utils/utilsFile.js";
  import type { GridApi } from "ag-grid-community";
  import type { CsvMaker, CsvResult } from "./csvFormat";
  import {
    CSV_COPY_MAX_ROWS,
    downloadCsvFile,
    getCsvRequest,
    getCsvRowCount,
    getCsvTextUpTo,
    showSnackBarAsCopiedFirstRows,
    showSnackBarAsExportFailed,
    type CsvSelectedValues,
  } from "./exportCsv";

  interface Props {
    gridApi: GridApi<GridRow> | undefined;
    dialogElement?: HTMLDialogElement;
    exportFilePrefix: ExportFilePrefix;
    // Makes the CSV of All in a worker instead of ag-grid.
    csvOfAllRows?: CsvMaker;
  }

  let {
    gridApi,
    dialogElement = $bindable(),
    exportFilePrefix,
    csvOfAllRows,
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

  // The rows of the selected one of All and Filtered & Sorted.
  let rowCount: number | undefined = $state();
  $effect(() => {
    const filteredSorted: CsvSelectedValues["filteredSorted"]["selectedValue"] =
      selectedValues.filteredSorted.selectedValue;
    if (!gridApi) {
      rowCount = undefined;
      return;
    }
    const api: GridApi<GridRow> = gridApi;
    const updateRowCount = (): void => {
      rowCount = getCsvRowCount(api, filteredSorted);
    };
    updateRowCount();
    // New rows, the filters and the quick search change it.
    api.addEventListener("modelUpdated", updateRowCount);
    return () => {
      if (!api.isDestroyed()) {
        api.removeEventListener("modelUpdated", updateRowCount);
      }
    };
  });

  // While the worker makes the CSV.
  let isMaking: boolean = $state(false);

  function getWorkerCsvMaker(): CsvMaker | undefined {
    return selectedValues.filteredSorted.selectedValue === "all"
      ? csvOfAllRows
      : undefined;
  }

  async function downloadCsv(): Promise<void> {
    if (!gridApi || isMaking) return;
    const fileName = getExportFileName(exportFilePrefix, page.params, "csv");
    const makeCsv: CsvMaker | undefined = getWorkerCsvMaker();
    if (!makeCsv) {
      downloadCsvFile(gridApi, selectedValues, fileName);
      return;
    }
    isMaking = true;
    try {
      const { blob } = await makeCsv(getCsvRequest(gridApi, selectedValues));
      // With the byte order mark, as ag-grid's export.
      exportBlobToFile(
        new Blob(["\uFEFF", blob], { type: "text/plain" }),
        fileName,
      );
    } catch (error) {
      customLogger.error("ExportCsv: make the CSV in the worker.", error);
      $storeNoDbSnackBar = showSnackBarAsExportFailed;
    } finally {
      isMaking = false;
    }
  }
  async function copyToClipboard(): Promise<void> {
    if (!gridApi || isMaking) return;
    const makeCsv: CsvMaker | undefined = getWorkerCsvMaker();
    if (!makeCsv) {
      const csvText = getCsvTextUpTo(
        gridApi,
        selectedValues,
        CSV_COPY_MAX_ROWS,
      );
      const snackbar = await copyTextToClipboard(csvText.text);
      $storeNoDbSnackBar = copiedSnackbar(snackbar, csvText);
      return;
    }
    isMaking = true;
    try {
      // The clipboard is asked in the click, before the worker ends.
      const result: Promise<CsvResult> = makeCsv(
        getCsvRequest(gridApi, selectedValues, CSV_COPY_MAX_ROWS),
      );
      // It fails when the worker fails.
      const snackbar = await copyBlobToClipboard(
        result.then(({ blob }) => blob),
      );
      $storeNoDbSnackBar =
        snackbar === showSnackBarAsCopied
          ? copiedSnackbar(snackbar, await result)
          : snackbar;
    } finally {
      isMaking = false;
    }
  }
  function copiedSnackbar(
    snackbar: BaseSnackbarProps,
    { rowCount, totalRowCount }: Pick<CsvResult, "rowCount" | "totalRowCount">,
  ): BaseSnackbarProps {
    return snackbar === showSnackBarAsCopied && rowCount < totalRowCount
      ? showSnackBarAsCopiedFirstRows
      : snackbar;
  }

  let footerDefinition: PageWrapperContentFooterDefinition = $derived({
    buttonsDefinition: [
      {
        iconName: "download",
        tooltipText: "Export",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: downloadCsv,
        disabled: isMaking,
      },
      {
        iconName: "contentCopy",
        tooltipText: "Copy",
        tooltipXPosition: "left",
        tooltipYPosition: "top",
        onClickEventFunction: copyToClipboard,
        disabled: isMaking,
      },
    ],
    buttonSize: sizeSettings.dialogFooter,
    horizontalAlignment: "between",
  });
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
        <PageWrapperContentFooterComponent {footerDefinition}>
          <BaseLabel
            textSize={sizeSettings.dialogBodyContent}
            text={isMaking
              ? MESSAGE_MAKING_CSV
              : rowCount === undefined
                ? ""
                : `${numberWithCommas(rowCount)} rows`}
            colorCategoryFront={colorCategory}
          />
        </PageWrapperContentFooterComponent>
      {/snippet}
    </PageWrapperContent>
  {/snippet}
</BaseDialog>
