<script lang="ts">
  import BaseProgressBarForBlockNumber from "$lib/base/BaseProgressBarForBlockNumber/BaseProgressBarForBlockNumber.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import type { SyncStatusContract } from "@db/dbTypes";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import ContractOverviewBasic from "../../ContractOverviewBasic.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;

  let targetContractSyncStatus: SyncStatusContract;
  $: targetContractSyncStatus =
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name];

  let fetchedBlockNumber: number;
  $: fetchedBlockNumber = targetContractSyncStatus.fetchedBlockNumber;

  let latestBlockNumber: number;
  $: latestBlockNumber = $storeChainStatus[targetChain.name].latestBlockNumber;
</script>

<ContractOverviewBasic
  {targetChain}
  {targetProject}
  {targetVersion}
  {targetContract}
  activateLinkOfContractName
>
  <CommonItemMember text="Sync Progress">
    <BaseProgressBarForBlockNumber
      startBlockNumber={targetContract.creation.blockNumber}
      endBlockNumber={latestBlockNumber}
      showBlockNumber={true}
      {fetchedBlockNumber}
      colorCategoryFront={colorSettings.itemMemberProgressBarFront}
      colorCategoryBg={colorSettings.itemMemberProgressBarBg}
      rounded
      size={sizeSettings.itemMember}
      shadowBar={false}
      processing={targetContractSyncStatus.isSyncing}
    />
  </CommonItemMember>
</ContractOverviewBasic>
