<script lang="ts">
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import type { Contract } from "@constants/chains/types";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";

  export let targetContract: Contract;
</script>

<CommonItemMember
  text={targetContract.fallback.abiFragment ? "State Mutability" : undefined}
>
  <BaseLabel
    text={targetContract.fallback.abiFragment
      ? targetContract.fallback.abiFragment.stateMutability
      : "The contract has no fallback."}
    italic={targetContract.fallback.abiFragment ? false : true}
    textSize={targetContract.fallback.abiFragment
      ? sizeSettings.itemMember
      : sizeSettings.itemWarnningMessage}
  />
</CommonItemMember>
