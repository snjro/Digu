<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import AbiParamsTable from "$lib/contracts/abiParams/AbiParamsTable.svelte";
  import type { FunctionAbiFragment } from "@constants/chains/types";

  type ParamIdentifier = Extract<
    keyof FunctionAbiFragment,
    "inputs" | "outputs"
  >;
  interface Props {
    targetFunctionAbiFragment: FunctionAbiFragment;
    paramIdentifier: ParamIdentifier;
  }

  let { targetFunctionAbiFragment, paramIdentifier }: Props = $props();
  const paramTypes: FunctionAbiFragment[ParamIdentifier] = $derived(
    targetFunctionAbiFragment[paramIdentifier],
  );
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
