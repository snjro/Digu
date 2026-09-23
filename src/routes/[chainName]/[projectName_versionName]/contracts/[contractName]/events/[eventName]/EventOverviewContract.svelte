<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseProgressBarForBlockNumber from "$lib/base/BaseProgressBarForBlockNumber/BaseProgressBarForBlockNumber.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import CommonToggleSyncTarget from "$lib/common/CommonToggleSyncTarget.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import type { SyncStatusContract } from "@db/dbTypes";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { hasSyncTargetEvents } from "@utils/utilsEthers";
  import ContractOverviewBasic from "../../ContractOverviewBasic.svelte";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
    targetContract: Contract;
  }

  let { targetChain, targetProject, targetVersion, targetContract }: Props =
    $props();

  // undefined for contracts that have no event to sync (anonymous events only)
  let targetContractSyncStatus: SyncStatusContract | undefined = $derived(
    hasSyncTargetEvents(targetContract)
      ? $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
          .subSyncStatuses[targetVersion.name].subSyncStatuses[
          targetContract.name
        ]
      : undefined,
  );

  let latestBlockNumber: number = $derived(
    $storeChainStatus[targetChain.name].latestBlockNumber,
  );
</script>

<ContractOverviewBasic
  {targetChain}
  {targetProject}
  {targetVersion}
  {targetContract}
  activateLinkOfContractName
>
  {#if targetContractSyncStatus}
    <CommonItemMember text="Sync Target">
      <CommonToggleSyncTarget
        size={sizeSettings.itemMember}
        {targetChain}
        {targetProject}
        {targetVersion}
        {targetContract}
      />
    </CommonItemMember>

    <CommonItemMember text="Sync Progress">
      <BaseProgressBarForBlockNumber
        startBlockNumber={targetContract.creation.blockNumber}
        endBlockNumber={latestBlockNumber}
        showBlockNumber={true}
        fetchedBlockNumber={targetContractSyncStatus.fetchedBlockNumber}
        colorCategoryFront={colorSettings.itemMemberProgressBarFront}
        colorCategoryBg={colorSettings.itemMemberProgressBarBg}
        rounded
        size={sizeSettings.itemMember}
        shadowBar={false}
        processing={targetContractSyncStatus.isSyncing}
      />
    </CommonItemMember>
  {/if}
</ContractOverviewBasic>
