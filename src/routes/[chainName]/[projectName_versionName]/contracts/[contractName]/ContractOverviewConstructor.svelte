<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import AbiParamsTable from "$lib/contracts/abiParams/AbiParamsTable.svelte";
  import type { Contract } from "@constants/chains/types";

  export let targetContract: Contract;
</script>

<CommonItemMember text="State Mutability">
  <BaseLabel
    text={targetContract.construction.abiFragment.stateMutability}
    textSize={sizeSettings.itemMember}
  />
</CommonItemMember>
<CommonItemMember text="Inputs">
  {#if targetContract.construction.abiFragment.inputs.length}
    <AbiParamsTable
      dialogHeaderText="inputs"
      paramTypes={targetContract.construction.abiFragment.inputs}
      showInputIndexedField={false}
    />
  {:else}
    <BaseLabel
      text={"The constructor has no inputs."}
      italic
      textSize={sizeSettings.itemWarnningMessage}
    />
  {/if}
</CommonItemMember>
