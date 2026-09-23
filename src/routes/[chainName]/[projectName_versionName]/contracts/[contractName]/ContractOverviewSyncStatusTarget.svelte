<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import CommonToggleSyncTarget from "$lib/common/CommonToggleSyncTarget.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
    targetContract: Contract;
  }

  let { targetChain, targetProject, targetVersion, targetContract }: Props =
    $props();
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
