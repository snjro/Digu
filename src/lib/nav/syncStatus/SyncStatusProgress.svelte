<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { getProgressRate } from "$lib/base/BaseProgressBarForBlockNumber/progressRate";
  import BaseProgressCircle from "$lib/base/BaseProgressCircle/BaseProgressCircle.svelte";
  import BaseProgressCircleSyncStatus from "$lib/base/BaseProgressCircle/BaseProgressCircleSyncStatus.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import type { SyncStateTextLabelProps } from "$lib/common/CommonSyncStateText.svelte";
  import type { Chain, ChainName } from "@constants/chains/types";
  import type { SyncStateText } from "@db/dbTypes";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { NO_DATA } from "@utils/utilsCostants";
  import { getTargetChain } from "@utils/utlisDb";
  import classNames from "classnames";

  export let hideProgressCircle: boolean;

  const progressCircleSize: BaseSize = sizeSettings.navProgressCircle;

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
    size: hideProgressCircle
      ? progressCircleSize
      : changeSize(progressCircleSize, 3),
    showIcon: false,
    currentSyncingState: NO_DATA,
  };
</script>

<div class={classNames("w-[70px]", "h-full")}>
  {#if hideProgressCircle}
    <div class={classNames("flex", "flex-col", "w-fit", "mt-1")}>
      <BaseProgressCircleSyncStatus
        progressRate={getProgressRate(
          creationBlockNumber,
          latestBlockNumber * numOfSyncTargetContract,
          fetchedBlockNumber,
        )}
        percentageSize={changeSize(progressCircleSize, 1)}
        {syncStateTextLabelProps}
        isAnimatePulse={isStopping}
      />
    </div>
  {:else}
    <BaseProgressCircle
      circleSize={progressCircleSize}
      startValue={creationBlockNumber}
      goalValue={latestBlockNumber * numOfSyncTargetContract}
      currentValue={fetchedBlockNumber}
      detailsPosition="none"
      colorCategoryCircleBg={colorSettings.navBg}
      {syncStateTextLabelProps}
    />
  {/if}
</div>
