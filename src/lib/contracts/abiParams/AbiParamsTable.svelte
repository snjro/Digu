<script lang="ts" module>
  export type CommonAbiParamsTableProps = {
    paramTypes:
      | EventAbiFragment["inputs"]
      | FunctionAbiFragment["inputs"]
      | FunctionAbiFragment["outputs"];
    dialogHeaderText: string;
    size: BaseSize;
  };
</script>

<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseTable from "$lib/base/BaseTable/BaseTable.svelte";
  import type { BaseTableBodyCellProps } from "$lib/base/BaseTable/BaseTableBodyCell.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type {
    EventAbiFragment,
    FunctionAbiFragment,
  } from "@constants/chains/types";
  import AbiParamsTableRow from "./AbiParamsTableRow.svelte";

  interface Props {
    paramTypes: CommonAbiParamsTableProps["paramTypes"];
    dialogHeaderText: CommonAbiParamsTableProps["dialogHeaderText"];
    showInputIndexedField: boolean;
  }

  let { paramTypes, dialogHeaderText, showInputIndexedField }: Props = $props();

  const abiParamTabelSize: BaseSize = sizeSettings.abiParamsTable;

  const tableHeaderCellProps = (): BaseTableBodyCellProps[] => {
    let headerCellProps: BaseTableBodyCellProps[] = [
      {
        text: "Name",
        align: "left",
        textSize: abiParamTabelSize,
      },
      {
        text: "Type",
        align: "center",
        textSize: abiParamTabelSize,
      },
      {
        text: "Indexed",
        align: "center",
        textSize: abiParamTabelSize,
      },
      {
        text: "Components",
        align: "center",
        textSize: abiParamTabelSize,
      },
    ];
    if (!showInputIndexedField) {
      headerCellProps.splice(2, 1);
    }
    return headerCellProps;
  };
</script>

<BaseTable
  tableHeaderCellProps={tableHeaderCellProps()}
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
