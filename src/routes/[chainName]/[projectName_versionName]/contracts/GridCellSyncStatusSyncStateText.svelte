<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import CommonSyncStateText from "$lib/common/CommonSyncStateText.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import type { SyncStatusContract } from "@db/dbTypes";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { NO_DATA } from "@utils/utilsConstants";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
    targetContract: Contract;
  }

  let { targetChain, targetProject, targetVersion, targetContract }: Props =
    $props();

  let syncStatusContract: SyncStatusContract | undefined = $derived(
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name],
  );
</script>

{#if syncStatusContract}
  <CommonSyncStateText
    syncStateText={syncStatusContract.syncStateText}
    size={sizeSettings.grid}
    colorCategoryFront={colorSettings.gridCell}
  />
{:else}
  <BaseLabel text={NO_DATA} textSize={sizeSettings.grid} />
{/if}
