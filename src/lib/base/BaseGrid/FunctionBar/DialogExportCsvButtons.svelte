<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";

  import { buttonHeight, type BaseSize } from "$lib/base/baseSizes";

  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  import type { ExportCsvRadioProps } from "./DialogExportCsv.svelte";
  import type { ChainName, ContractName } from "@constants/chains/types";
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
      getCsvFileName()
    );
  }
  function getCsvFileName(): string {
    const chainName: ChainName = $page.params.chainName;
    const projectVersionName: string = $page.params.projectName_versionName;
    const contractName: ContractName = $page.params.contractName;
    const csvFileName: string = `ABI-${chainName}-${projectVersionName}-${contractName}.csv`;
    return csvFileName;
  }
</script>

<div class={classNames("flex", "flex-row", "pt-3", "space-x-3", "justify-end")}>
  <BaseButtonIcon
    prefixIcon={true}
    iconName="download"
    hoverEffect
    label="Export"
    {size}
    colorCategoryFront={"interactive"}
    colorCategoryBg={colorSettings.dialogBody}
    appendClassButton={buttonHeight[size]}
    on:click={downloadCsvFile}
  />
  <BaseButtonIcon
    prefixIcon={true}
    iconName="contentCopy"
    hoverEffect
    label="Copy"
    {size}
    colorCategoryFront={"interactive"}
    colorCategoryBg={colorSettings.dialogBody}
    appendClassButton={buttonHeight[size]}
    on:click={copyToClipboard}
  />
</div>
