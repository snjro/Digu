<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import CommonSyncCurrentState from "$lib/common/CommonSyncCurrentState.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
</script>

<CommonItemMember text="Current State">
  <CommonSyncCurrentState
    colorCategoryFront={colorSettings.itemMemberText}
    size={sizeSettings.itemMember}
    {targetChain}
    {targetProject}
    {targetVersion}
    {targetContract}
  />
</CommonItemMember>
