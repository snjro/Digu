<script lang="ts" context="module">
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
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseTableBodyCell from "$lib/base/BaseTable/BaseTableBodyCell.svelte";
  import BaseTableRow from "$lib/base/BaseTable/BaseTableRow.svelte";
  import SequenceBodyCell from "$lib/base/BaseTable/SequenceBodyCell.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import { getComponentsFromAbiFragmentParam } from "$lib/gridColumnDefs/columnDefAbiParamsArgsChildren";
  import type {
    AbiFragmentParam,
    EventAbiFragment,
    FunctionAbiFragment,
  } from "@constants/chains/types";
  import { NO_DATA } from "@utils/utilsCostants";
  import AbiParamComponentsDetailsButton from "./AbiParamComponentsDetailsButton.svelte";

  export let paramType: AbiFragmentParam;
  export let dialogHeaderText: CommonAbiParamsTableProps["dialogHeaderText"];
  // export let colorCategoryBg: ColorCategory;
  export let showInputIndexedField: boolean;
  export let rowIndex: number;

  const abiParamsTabeSize: BaseSize = sizeSettings.abiParamsTable;
  const components: readonly AbiFragmentParam[] | undefined =
    getComponentsFromAbiFragmentParam(paramType);
</script>

<BaseTableRow>
  <SequenceBodyCell
    {rowIndex}
    textSize={abiParamsTabeSize}
    colorCategoryBorder={colorSettings.itemMemberTableBorder}
  />
  <BaseTableBodyCell
    text={paramType.name ? paramType.name : NO_DATA}
    align="left"
    textSize={abiParamsTabeSize}
  />
  <BaseTableBodyCell
    text={paramType.type}
    align="center"
    textSize={abiParamsTabeSize}
  />
  {#if showInputIndexedField}
    <BaseTableBodyCell
      text={paramType.indexed ? "true" : "false"}
      align="center"
      textSize={abiParamsTabeSize}
    />
  {/if}

  {#if components}
    <BaseTableBodyCell align="center" textSize={abiParamsTabeSize}>
      <AbiParamComponentsDetailsButton {dialogHeaderText} {components} />
    </BaseTableBodyCell>
  {:else}
    <BaseTableBodyCell
      text={NO_DATA}
      align="center"
      textSize={abiParamsTabeSize}
    />
  {/if}
</BaseTableRow>
