<script lang="ts">
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import type { Chain, Project, Version } from "@constants/chains/types";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import CommonSyncCurrentState from "$lib/common/CommonSyncCurrentState.svelte";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
</script>

<CommonItemMember text="Current State">
  <CommonSyncCurrentState
    size={sizeSettings.itemMember}
    colorCategoryFront={colorSettings.itemMemberText}
    {targetChain}
    {targetProject}
    {targetVersion}
  />
</CommonItemMember>
