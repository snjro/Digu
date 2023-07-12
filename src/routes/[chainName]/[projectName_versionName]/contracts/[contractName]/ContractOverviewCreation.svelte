<script lang="ts">
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import CommonChainExplorerLink from "$lib/common/CommonChainExplorerLink.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import type { Contract } from "@constants/chains/types";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { convertTimestampSecToIso8601 } from "@utils/utilsTime";

  export let targetContract: Contract;
  const textSize: BaseSize = sizeSettings.itemMember;
</script>

<CommonItemMember text="Block Number">
  <CommonChainExplorerLink
    subdirectory="block"
    value={targetContract.creation.blockNumber.toString()}
    {textSize}
  />
</CommonItemMember>
<CommonItemMember text="Datetime">
  <BaseLabel
    text={targetContract.creation.timestamp
      ? convertTimestampSecToIso8601(targetContract.creation.timestamp)
      : undefined}
    {textSize}
  />
</CommonItemMember>
<CommonItemMember text="Transaction Hash">
  <CommonChainExplorerLink
    subdirectory="tx"
    value={targetContract.creation.tx}
    {textSize}
  />
</CommonItemMember>
<CommonItemMember text="Creator">
  <CommonChainExplorerLink
    subdirectory="address"
    value={targetContract.creation.creator}
    {textSize}
  />
</CommonItemMember>
