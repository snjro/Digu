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

  interface Props {
    hideProgressCircle: boolean;
  }

  let { hideProgressCircle }: Props = $props();

  const progressCircleSize: BaseSize = sizeSettings.navProgressCircle;

  let targetChainName: ChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );

  let targetChain: Chain = $derived(
    getTargetChain({ chainName: targetChainName }),
  );

  let latestBlockNumber: number = $derived(
    $storeChainStatus[targetChainName].latestBlockNumber,
  );

  let creationBlockNumber: number = $derived(
    $storeSyncStatus[targetChainName].creationBlockNumber,
  );

  let numOfSyncTargetContract: number = $derived(
    $storeSyncStatus[targetChainName].numOfSyncTargetContract,
  );

  let fetchedBlockNumber: number = $derived(
    $storeSyncStatus[targetChainName].fetchedBlockNumber,
  );

  let syncStateText: SyncStateText = $derived(
    $storeSyncStatus[targetChain.name].syncStateText,
  );

  let isStopping: boolean = $derived(syncStateText === "stopping");

  let syncStateTextLabelProps: SyncStateTextLabelProps = $derived({
    syncStateText: syncStateText,
    colorCategoryFront: colorSettings.navText,
    size: hideProgressCircle
      ? progressCircleSize
      : changeSize(progressCircleSize, 3),
    showIcon: false,
    currentSyncingState: NO_DATA,
  });
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
