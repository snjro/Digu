<script lang="ts" generics="GridRow">
  import { page } from "$app/stores";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { buttonHeight, type BaseSize } from "$lib/base/baseSizes";
  import { showSnackBarAsCopied } from "$lib/common/CommonCopyButton.svelte";
  import { storeNoDbSnackBar } from "@stores/storeNoDb";
  import { getExportFileName, type ExportFilePrefix } from "@utils/utilsFile";
  import type { GridOptions } from "ag-grid-community";
  import classNames from "classnames";
  import type { ExportCsvRadioProps } from "./DialogExportCsv.svelte";
  import { exportCsvFile } from "./exportCsvData";

  export let gridOptions: GridOptions<GridRow>;
  export let exportCsvRadioProps: ExportCsvRadioProps;
  export let exportFilePrefix: ExportFilePrefix;

  const size: BaseSize = sizeSettings.dialogFooter;
  function copyToClipboard(): void {
    const csvData: string = exportCsvFile(
      gridOptions,
      exportCsvRadioProps.skipRowNumber.selectedValue,
      exportCsvRadioProps.columnSeparator.selectedValue,
      exportCsvRadioProps.suppressDoubleQuotes.selectedValue,
      exportCsvRadioProps.filteredSorted.selectedValue,
      exportCsvRadioProps.skipColumnHeaders.selectedValue,
    ) as string;
    navigator.clipboard.writeText(csvData);
    // TODO change the position of snackbar
    $storeNoDbSnackBar = showSnackBarAsCopied;
  }
  function downloadCsvFile(): void {
    exportCsvFile(
      gridOptions,
      exportCsvRadioProps.skipRowNumber.selectedValue,
      exportCsvRadioProps.columnSeparator.selectedValue,
      exportCsvRadioProps.suppressDoubleQuotes.selectedValue,
      exportCsvRadioProps.filteredSorted.selectedValue,
      exportCsvRadioProps.skipColumnHeaders.selectedValue,
      getExportFileName(exportFilePrefix, $page.params, "csv"),
    );
  }
  type ButtonIconProp = {
    iconName: BaseIconProps["name"];
    label: string;
    onClick: () => void;
  };
  const buttonIconProps: ButtonIconProp[] = [
    {
      iconName: "download",
      label: "Export",
      onClick: downloadCsvFile,
    },
    {
      iconName: "contentCopy",
      label: "Copy",
      onClick: copyToClipboard,
    },
  ];
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "py-1",
    "space-x-3",
    "justify-end",
    "h-fit",
  )}
>
  {#each buttonIconProps as buttonIconProp}
    <BaseButtonIcon
      prefixIcon
      iconName={buttonIconProp.iconName}
      hoverEffect
      label={buttonIconProp.label}
      {size}
      colorCategoryFront={"white"}
      colorCategoryBg={"interactive"}
      appendClassButton={buttonHeight[size]}
      on:click={buttonIconProp.onClick}
    />
  {/each}
</div>
