<script lang="ts">
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import AbiParamsTable from "$lib/contracts/abiParams/AbiParamsTable.svelte";
  import type { FunctionAbiFragment } from "@constants/chains/types";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";

  type ParamIdentifier = Extract<
    keyof FunctionAbiFragment,
    "inputs" | "outputs"
  >;
  export let targetFunctionAbiFragment: FunctionAbiFragment;
  export let paramIdentifier: ParamIdentifier;
  const paramTypes: FunctionAbiFragment[ParamIdentifier] =
    targetFunctionAbiFragment[paramIdentifier];
</script>

{#if paramTypes.length > 0}
  <AbiParamsTable
    dialogHeaderText={paramIdentifier}
    {paramTypes}
    showInputIndexedField={false}
  />
{:else}
  <BaseLabel
    text={`The function has no ${paramIdentifier}.`}
    italic
    textSize={sizeSettings.itemWarnningMessage}
  />
{/if}
