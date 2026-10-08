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
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseTableBodyCell from "#lib/base/BaseTable/BaseTableBodyCell.svelte";
  import BaseTableRow from "#lib/base/BaseTable/BaseTableRow.svelte";
  import SequenceBodyCell from "#lib/base/BaseTable/SequenceBodyCell.svelte";
  import type { BaseSize } from "#lib/base/baseSizes.js";
  import {
    getAbiParamText,
    getComponentsFromAbiFragmentParam,
  } from "#lib/gridColumnDefs/columnDefAbiParamsArgsChildren.js";
  import type {
    AbiFragmentParam,
    EventAbiFragment,
    FunctionAbiFragment,
  } from "#constants/chains/types.js";
  import { NO_DATA } from "#utils/utilsConstants.js";
  import AbiParamComponentsDetailsButton from "./AbiParamComponentsDetailsButton.svelte";

  interface Props {
    paramType: AbiFragmentParam;
    dialogHeaderText: CommonAbiParamsTableProps["dialogHeaderText"];
    showInputIndexedField: boolean;
    rowIndex: number;
  }

  let { paramType, dialogHeaderText, showInputIndexedField, rowIndex }: Props =
    $props();

  const abiParamsTabeSize: BaseSize = sizeSettings.abiParamsTable;
  const components: readonly AbiFragmentParam[] | undefined = $derived(
    getComponentsFromAbiFragmentParam(paramType),
  );
</script>

<BaseTableRow>
  <SequenceBodyCell
    {rowIndex}
    textSize={abiParamsTabeSize}
    colorCategoryBorder={colorSettings.itemMemberTableBorder}
  />
  <BaseTableBodyCell
    text={getAbiParamText(paramType, "name")}
    align="left"
    textSize={abiParamsTabeSize}
  />
  <BaseTableBodyCell
    text={getAbiParamText(paramType, "type")}
    align="center"
    textSize={abiParamsTabeSize}
  />
  {#if showInputIndexedField}
    <BaseTableBodyCell
      text={getAbiParamText(paramType, "indexed")}
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
