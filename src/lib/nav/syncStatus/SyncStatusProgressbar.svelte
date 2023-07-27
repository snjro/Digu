<script lang="ts">
  // import { round } from "@utils/utilsMath";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import type { ChainName } from "@constants/chains/types";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseProgressBarForBlockNumber from "$lib/base/BaseProgressBarForBlockNumber/BaseProgressBarForBlockNumber.svelte";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  // const numOfDecimals = 2;

  let targetChainName: ChainName;
  $: targetChainName = $storeUserSettings.selectedChainName.toString();

  let latestBlockNumber: number;
  $: latestBlockNumber = $storeChainStatus[targetChainName].latestBlockNumber;

  let creationBlockNumber: number;
  $: creationBlockNumber =
    $storeSyncStatus[targetChainName].creationBlockNumber;

  let numOfSyncTargetContract: number;
  $: numOfSyncTargetContract =
    $storeSyncStatus[targetChainName].numOfSyncTargetContract;

  let fetchedBlockNumber: number;
  $: fetchedBlockNumber = $storeSyncStatus[targetChainName].fetchedBlockNumber;

  let isSyncing: boolean;
  $: isSyncing = $storeSyncStatus[targetChainName].isSyncing;
</script>

<BaseProgressBarForBlockNumber
  size={sizeSettings.navProgressBar}
  processing={isSyncing}
  colorCategoryFront={colorSettings.navBg}
  colorCategoryBg={colorSettings.navInput}
  startBlockNumber={creationBlockNumber}
  endBlockNumber={latestBlockNumber * numOfSyncTargetContract}
  {fetchedBlockNumber}
  showBlockNumber={false}
  rounded
  shadowBar={false}
/>
