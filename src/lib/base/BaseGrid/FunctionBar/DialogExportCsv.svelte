<script lang="ts" context="module">
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

<script lang="ts">
  import type { ExportFilePrefix } from "@utils/utilsFile";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseDialog, {
    openDialog,
  } from "$lib/base/BaseDialog/BaseDialog.svelte";
  import BaseRadio, {
    type RadioLabelAndValues,
  } from "$lib/base/BaseRadio.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import classNames from "classnames";
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { CsvColumnSeparator, CsvFilteredSorted } from "./exportCsvData";
  import type { GridOptions } from "ag-grid-community";
  import DialogExportCsvButtons from "./DialogExportCsvButtons.svelte";

  type GridRow = $$Generic;
  export let gridOptions: GridOptions<GridRow>;
  export let dialogElement: HTMLDialogElement;
  export let exportFilePrefix: ExportFilePrefix;

  const colorCategory: ColorCategory = colorSettings.dialogHeader;

  let exportCsvRadioProps: ExportCsvRadioProps = {
    skipRowNumber: {
      title: "Row number",
      subTitle: "Include the row number which is the first column?",
      groupName: "includeRowNumber",
      selectedValue: false,
      radioLabelAndValues: [
        {
          labelText: "Yes",
          value: false,
          inputId: "includeRowNumberYes",
        },
        {
          labelText: "No",
          value: true,
          inputId: "includeRowNumberNo",
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
          inputId: "columnSeparatorComma",
        },
        {
          labelText: `Tab`,
          value: `\t`,
          inputId: "columnSeparatorTab",
        },
        {
          labelText: `Bar "|"`,
          value: `|`,
          inputId: "columnSeparatorBar",
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
          inputId: "wrapDoubleQuotesYes",
        },
        {
          labelText: "No",
          value: true,
          inputId: "wrapDoubleQuotesNo",
        },
      ],
    },
    skipColumnHeaders: {
      title: "Column headers",
      subTitle: "Export column headers?",
      groupName: "ExportColumnHeaders",
      selectedValue: false,
      radioLabelAndValues: [
        {
          labelText: "Yes",
          value: false,
          inputId: "exportColumnHeadersYes",
        },
        {
          labelText: "No",
          value: true,
          inputId: "exportColumnHeadersNo",
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
          inputId: "filteredAndSortedNo",
        },
        {
          labelText: "Filtered & Sorted",
          value: "filteredAndSorted",
          inputId: "filteredAndSortedYes",
        },
      ],
    },
  };
  const radioPropsKeys = Object.keys(
    exportCsvRadioProps
  ) as (keyof ExportCsvRadioProps)[];
</script>

<BaseDialog bind:dialogElement headerText="Export CSV File">
  <form slot="dialogBody" class={classNames("space-y-3", "")}>
    <ul class={classNames("space-y-3")}>
      {#each radioPropsKeys as key}
        <CommonItemMember text={exportCsvRadioProps[key].title}>
          <ul class={classNames("space-y-1")}>
            <li>
              <BaseLabel
                text={exportCsvRadioProps[key].subTitle}
                colorCategoryFront={colorCategory}
                textSize={sizeSettings.dialogBodyContent}
              />
            </li>
            <li>
              <BaseRadio
                radioButtonType="button"
                border
                size={sizeSettings.dialogBodyContent}
                labelAndValues={exportCsvRadioProps[key].radioLabelAndValues}
                groupName={exportCsvRadioProps[key].groupName}
                bind:selectedValue={exportCsvRadioProps[key].selectedValue}
              />
            </li>
          </ul>
        </CommonItemMember>
      {/each}
    </ul>
    <DialogExportCsvButtons
      {gridOptions}
      {exportCsvRadioProps}
      {exportFilePrefix}
    />
  </form>
</BaseDialog>
