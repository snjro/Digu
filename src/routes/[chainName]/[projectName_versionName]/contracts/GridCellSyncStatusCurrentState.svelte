<script lang="ts">
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import CommonSyncCurrentState from "$lib/common/CommonSyncCurrentState.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { NO_DATA } from "@utils/utilsCostants";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
</script>

{#if targetContract.events.abiFragments.length > 0}
  <CommonSyncCurrentState
    {targetChain}
    {targetProject}
    {targetVersion}
    {targetContract}
    size={sizeSettings.grid}
    colorCategoryFront={colorSettings.gridCell}
  />
{:else}
  <BaseLabel text={NO_DATA} textSize={sizeSettings.grid} />
{/if}
