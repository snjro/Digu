<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import type { FunctionAbiFragment } from "@constants/chains/types";

  export let targetFunctionAbiFragment: FunctionAbiFragment;

  const textSize = sizeSettings.itemMember;
</script>

<CommonItemMember text="Function Name">
  <BaseLabel text={targetFunctionAbiFragment.name} {textSize} />
</CommonItemMember>
<CommonItemMember text="State Mutability">
  <BaseLabel text={targetFunctionAbiFragment.stateMutability} {textSize} />
</CommonItemMember>
<CommonItemMember text="Function Selector">
  <BaseLabel text={targetFunctionAbiFragment.selector} {textSize} />
</CommonItemMember>
