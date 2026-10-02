<script lang="ts">
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import {
    getProgressRate,
    getProgressRateForLabel,
  } from "#lib/base/BaseProgressBarForBlockNumber/progressRate.js";
  import BaseProgressCircle from "#lib/base/BaseProgressCircle/BaseProgressCircle.svelte";
  import BaseProgressCircleSyncStatus from "#lib/base/BaseProgressCircle/BaseProgressCircleSyncStatus.svelte";
  import { changeSize, type BaseSize } from "#lib/base/baseSizes.js";
  import type { SyncStateTextLabelProps } from "#lib/common/CommonSyncStateText.svelte";
  import type { Chain, ChainName } from "#constants/chains/types.js";
  import type { SyncStateText } from "#db/dbTypes.js";
  import { storeChainStatus } from "#stores/storeChainStatus.js";
  import { storeSyncStatus } from "#stores/storeSyncStatus.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import { NO_DATA } from "#utils/utilsConstants.js";
  import { getTargetChain } from "#utils/utilsDb.js";
  import classNames from "classnames";
  import { SYNC_PANEL_ID } from "./syncPanel";

  interface Props {
    hideProgressCircle: boolean;
    isSyncPanelOpen: boolean;
    syncPanelButton?: HTMLButtonElement | undefined;
  }

  let {
    hideProgressCircle,
    isSyncPanelOpen = $bindable(),
    syncPanelButton = $bindable(),
  }: Props = $props();

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

  let progressRate: number = $derived(
    getProgressRate(
      creationBlockNumber,
      latestBlockNumber * numOfSyncTargetContract,
      fetchedBlockNumber,
    ),
  );
  let ariaLabel: string = $derived(
    `Sync of ${targetChain.fullName}: ${getProgressRateForLabel(progressRate)}%, ${syncStateText}`,
  );

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

<button
  bind:this={syncPanelButton}
  type="button"
  aria-label={ariaLabel}
  aria-expanded={isSyncPanelOpen}
  aria-controls={SYNC_PANEL_ID}
  class={classNames(
    "block",
    "w-[70px]",
    "h-full",
    "text-left",
    "cursor-pointer",
    "rounded-sm",
  )}
  onclick={() => (isSyncPanelOpen = !isSyncPanelOpen)}
>
  {#if hideProgressCircle}
    <div class={classNames("flex", "flex-col", "w-fit", "mt-1")}>
      <BaseProgressCircleSyncStatus
        {progressRate}
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
</button>
