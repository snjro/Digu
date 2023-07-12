<script lang="ts">
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import CommonToggleSyncTarget from "$lib/common/CommonToggleSyncTarget.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
</script>

<CommonItemMember text="Target">
  <CommonToggleSyncTarget
    size={sizeSettings.itemMember}
    {targetChain}
    {targetProject}
    {targetVersion}
    {targetContract}
  />
</CommonItemMember>
