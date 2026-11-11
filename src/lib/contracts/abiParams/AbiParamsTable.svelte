<script lang="ts" module>
  export type CommonAbiParamsTableProps = {
    paramTypes:
      | EventAbiFragment["inputs"]
      | FunctionAbiFragment["inputs"]
      | FunctionAbiFragment["outputs"];
    dialogHeaderText: string;
  };
</script>

<script lang="ts">
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseTable from "#lib/base/BaseTable/BaseTable.svelte";
  import type { BaseTableHeaderCellProps } from "#lib/base/BaseTable/BaseTableHeaderCell.svelte";
  import type { BaseSize } from "#lib/base/baseSizes.js";
  import type {
    EventAbiFragment,
    FunctionAbiFragment,
  } from "#constants/chains/types.js";
  import AbiParamsTableRow from "./AbiParamsTableRow.svelte";

  interface Props {
    paramTypes: CommonAbiParamsTableProps["paramTypes"];
    dialogHeaderText: CommonAbiParamsTableProps["dialogHeaderText"];
    showInputIndexedField: boolean;
  }

  let { paramTypes, dialogHeaderText, showInputIndexedField }: Props = $props();

  const abiParamTabelSize: BaseSize = sizeSettings.abiParamsTable;

  const header = (
    text: string,
    align: BaseTableHeaderCellProps["align"],
  ): BaseTableHeaderCellProps => ({ text, align, textSize: abiParamTabelSize });

  let tableHeaderCellProps: BaseTableHeaderCellProps[] = $derived([
    header("Name", "left"),
    header("Type", "center"),
    ...(showInputIndexedField ? [header("Indexed", "center")] : []),
    header("Components", "center"),
  ]);
</script>

<BaseTable
  {tableHeaderCellProps}
  textSize={abiParamTabelSize}
  numOfTableRows={paramTypes.length}
  scrollAreaLabel={dialogHeaderText}
>
  {#snippet tableBody()}
    {#each paramTypes as paramType, rowIndex (paramType)}
      <AbiParamsTableRow
        {paramType}
        {dialogHeaderText}
        {showInputIndexedField}
        {rowIndex}
      />
    {/each}
  {/snippet}
</BaseTable>
