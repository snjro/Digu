<script lang="ts">
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import { changeSize, type BaseSize } from "#lib/base/baseSizes.js";
  import CommonToggleSyncTarget from "#lib/common/CommonToggleSyncTarget.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "#constants/chains/types.js";
  import type { SyncStatusContract } from "#db/dbTypes.js";
  import { storeSyncStatus } from "#stores/storeSyncStatus.js";
  import { NO_DATA } from "#utils/utilsConstants.js";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
    targetContract: Contract;
  }

  let { targetChain, targetProject, targetVersion, targetContract }: Props =
    $props();

  const gridSize: BaseSize = sizeSettings.grid;

  let targetContractSyncStatus: SyncStatusContract | undefined = $derived(
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name],
  );
</script>

{#if targetContractSyncStatus}
  <CommonToggleSyncTarget
    {targetChain}
    {targetProject}
    {targetVersion}
    {targetContract}
    size={changeSize(gridSize, -1)}
  />
{:else}
  <BaseLabel text={NO_DATA} textSize={gridSize} />
{/if}
