<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import CommonToggleSyncTarget from "$lib/common/CommonToggleSyncTarget.svelte";
  import type { Chain, Project, Version } from "@constants/chains/types";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
</script>

<CommonItemMember text="Target">
  <CommonToggleSyncTarget
    size={sizeSettings.itemMember}
    {targetChain}
    {targetProject}
    {targetVersion}
  />
</CommonItemMember>
