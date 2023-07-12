<script lang="ts">
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import AbiParamsTable from "$lib/contracts/abiParams/AbiParamsTable.svelte";
  import type { EventAbiFragment } from "@constants/chains/types";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";

  export let targetEventAbiFragment: EventAbiFragment;

  const textSize: BaseSize = sizeSettings.itemMember;
</script>

<CommonItemMember text="Event Name">
  <BaseLabel text={targetEventAbiFragment.name} {textSize} />
</CommonItemMember>
<CommonItemMember text="Anonymous">
  <BaseLabel text={targetEventAbiFragment.anonymous.toString()} {textSize} />
</CommonItemMember>
<CommonItemMember text="Inputs">
  {#if targetEventAbiFragment.inputs.length > 0}
    <AbiParamsTable
      dialogHeaderText="inputs"
      paramTypes={targetEventAbiFragment.inputs}
      showInputIndexedField
    />
  {:else}
    <BaseLabel
      text={"The event has no inputs."}
      italic
      textSize={sizeSettings.itemWarnningMessage}
    />
  {/if}
</CommonItemMember>
<CommonItemMember text="Topic Hash">
  <BaseLabel
    text={targetEventAbiFragment.topicHash}
    {textSize}
    showCopyButton
  />
</CommonItemMember>
