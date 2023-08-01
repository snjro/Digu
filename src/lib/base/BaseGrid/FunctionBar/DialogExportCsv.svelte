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

<script lang="ts" generics="GridRow">
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

  export let gridOptions: GridOptions<GridRow>;
  export let dialogElement: HTMLDialogElement;
  export let exportFilePrefix: ExportFilePrefix;

  const colorCategory: ColorCategory = colorSettings.dialogHeader;

  let gridId: string | undefined = undefined;
  $: gridId = gridOptions.api?.getGridId();

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
      subTitle: "Export column headers?",
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
    exportCsvRadioProps ?? {}
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
