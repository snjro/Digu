<script lang="ts">
  import { storeChainStatus } from "@stores/storeChainStatus";
  import type { Chain, ChainName } from "@constants/chains/types";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import BaseProgressCircle from "$lib/base/BaseProgressCircle/BaseProgressCircle.svelte";
  import { getTargetChain } from "@utils/utlisDb";
  import classNames from "classnames";
  import { getProgressRate } from "$lib/base/BaseProgressBarForBlockNumber/progressRate";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { NO_DATA } from "@utils/utilsCostants";
  import BaseProgressCircleSyncStatus from "$lib/base/BaseProgressCircle/BaseProgressCircleSyncStatus.svelte";
  import type { SyncStateTextLabelProps } from "$lib/common/CommonSyncStateText.svelte";
  import type { SyncStateText } from "@db/dbTypes";
  import { changeSize } from "$lib/base/baseSizes";

  export let hideProgressCircle: boolean;

  let targetChainName: ChainName;
  $: targetChainName = $storeUserSettings.selectedChainName.toString();

  let targetChain: Chain;
  $: targetChain = getTargetChain({ chainName: targetChainName });

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

  let syncStateText: SyncStateText;
  $: syncStateText = $storeSyncStatus[targetChain.name].syncStateText;

  let isStopping: boolean;
  $: isStopping = syncStateText === "stopping";

  let syncStateTextLabelProps: SyncStateTextLabelProps;
  $: syncStateTextLabelProps = {
    syncStateText: syncStateText,
    colorCategoryFront: colorSettings.navText,
    size: sizeSettings.navProgressCircle,
    showIcon: false,
    currentSyncingState: NO_DATA,
  };
</script>

{#if hideProgressCircle}
  <div class={classNames("flex", "flex-col", "w-fit", "mt-1")}>
    <BaseProgressCircleSyncStatus
      progressRate={getProgressRate(
        creationBlockNumber,
        latestBlockNumber * numOfSyncTargetContract,
        fetchedBlockNumber
      )}
      percentageSize={changeSize(sizeSettings.navProgressCircle, 1)}
      {syncStateTextLabelProps}
      isAnimatePulse={isStopping}
    />
  </div>
{:else}
  <div class={classNames("w-[68px]", "h-full")}>
    <BaseProgressCircle
      circleSize={sizeSettings.navProgressCircle}
      startValue={creationBlockNumber}
      goalValue={latestBlockNumber * numOfSyncTargetContract}
      currentValue={fetchedBlockNumber}
      detailsPosition="none"
      colorCategoryCircleBg={colorSettings.navBg}
      {syncStateTextLabelProps}
    />
  </div>
{/if}
