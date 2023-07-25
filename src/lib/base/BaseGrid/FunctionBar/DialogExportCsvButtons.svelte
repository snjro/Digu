<script lang="ts">
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import { getExportFileName, type ExportFilePrefix } from "@utils/utilsFile";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { buttonHeight, type BaseSize } from "$lib/base/baseSizes";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import type { ExportCsvRadioProps } from "./DialogExportCsv.svelte";
  import { page } from "$app/stores";
  import type { GridOptions } from "ag-grid-community";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import classNames from "classnames";
  import { exportCsvFile } from "./exportCsvData";
  import { storeNoDbSnackBar } from "@stores/storeNoDb";
  import { showSnackBarAsCopied } from "$lib/common/CommonCopyButton.svelte";

  type GridRow = $$Generic;
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
      exportCsvRadioProps.skipColumnHeaders.selectedValue
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
      getExportFileName(exportFilePrefix, $page.params, "csv")
    );
  }
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
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

<div class={classNames("flex", "flex-row", "pt-3", "space-x-3", "justify-end")}>
  {#each buttonIconProps as buttonIconProp}
    <BaseButtonIcon
      prefixIcon
      iconName={buttonIconProp.iconName}
      hoverEffect
      label={buttonIconProp.label}
      {size}
      colorCategoryFront={"interactive"}
      colorCategoryBg={colorSettings.dialogBody}
      appendClassButton={buttonHeight[size]}
      border={themeColor === "dark"}
      on:click={buttonIconProp.onClick}
    />
  {/each}
</div>
