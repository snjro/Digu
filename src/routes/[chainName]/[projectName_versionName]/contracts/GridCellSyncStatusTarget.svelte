<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import CommonToggleSyncTarget from "$lib/common/CommonToggleSyncTarget.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import type { SyncStatusContract } from "@db/dbTypes";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { NO_DATA } from "@utils/utilsCostants";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;

  const girdSize: BaseSize = sizeSettings.grid;

  let targetContractSyncStatus: SyncStatusContract;
  $: targetContractSyncStatus =
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name];
</script>

{#if targetContractSyncStatus}
  <CommonToggleSyncTarget
    {targetChain}
    {targetProject}
    {targetVersion}
    {targetContract}
    size={changeSize(girdSize, -1)}
  />
{:else}
  <BaseLabel text={NO_DATA} textSize={girdSize} />
{/if}
