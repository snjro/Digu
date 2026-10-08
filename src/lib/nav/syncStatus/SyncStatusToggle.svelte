<script lang="ts">
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import type { BaseIconProps } from "#lib/base/BaseIcon.js";
  import BaseToggle from "#lib/base/BaseToggle.svelte";
  import { iconNameForSyncStateText } from "#lib/common/CommonSyncStateText.svelte";
  import { showSnackBarAsSaveFailed } from "#lib/common/saveFailed.js";
  import type { Chain, ChainName } from "#constants/chains/types.js";
  import { startAbortingInChain } from "#db/dbEventLogsDataHandlersSyncStatus.js";
  import type {
    ChainStatus,
    NodeStatus,
    SyncStateText,
    SyncStatus,
  } from "#db/dbTypes.js";
  import { fetchEventLogs } from "#eventLogs/eventLogs.js";
  import { storeSyncLockedByOtherTab } from "#eventLogs/syncLock.js";
  import { storeChainStatus } from "#stores/storeChainStatus.js";
  import { storeNoDbSnackBar } from "#stores/storeNoDb.js";
  import { storeSyncStatus } from "#stores/storeSyncStatus.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import { customLogger } from "#utils/logger.js";
  import { getTargetChain } from "#utils/utilsDb.js";
  import classNames from "classnames";
  import {
    selectWarpSyncState,
    storeWarpSync,
    type WarpSyncState,
  } from "#warpSync/warpSyncState.js";
  import { getSyncWaitsForImportText } from "#warpSync/warpSyncTexts.js";
  import { isSyncToggleDisabled } from "./syncToggleDisabled";

  let toggleOn: boolean = $state(false);
  let isStarting: boolean = $state(false);

  let targetChainName: ChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );

  let targetChain: Chain = $derived(
    getTargetChain({
      chainName: targetChainName,
    }),
  );

  let chainStatus: ChainStatus = $derived($storeChainStatus[targetChainName]);

  let nodeStatus: NodeStatus = $derived(chainStatus.nodeStatus);

  let targetChainSyncStatus: SyncStatus = $derived(
    $storeSyncStatus[targetChainName],
  );

  const toggleChanged = async (): Promise<void> => {
    toggleOn = !toggleOn;
    if (toggleOn) {
      // Until the sync has started, stopping it would miss some contracts.
      isStarting = true;
      const started: boolean = await fetchEventLogs(targetChain);
      isStarting = false;
      if (!started) toggleOn = false;
    } else {
      try {
        await startAbortingInChain(targetChain.name);
      } catch (error) {
        customLogger.error("Start aborting the sync.", {
          chainName: targetChain.name,
          errorObject: error,
        });
        $storeNoDbSnackBar = showSnackBarAsSaveFailed;
        // The sync goes on, unless it has stopped in the meantime.
        toggleOn = syncStateText !== "stopped";
      }
    }
  };

  let syncStateText: SyncStateText = $derived(
    $storeSyncStatus[targetChainName].syncStateText,
  );
  // toggleOn is one for all chains, so it follows the selected chain's sync.
  $effect.pre(() => {
    if (syncStateText === "stopped") toggleOn = false;
    else if (syncStateText === "syncing") toggleOn = true;
  });

  let isStopping: boolean = $derived(syncStateText === "stopping");
  let isSyncingInOtherTab: boolean = $derived(
    $storeSyncLockedByOtherTab[targetChainName],
  );
  let warpState: WarpSyncState = $derived(
    selectWarpSyncState($storeWarpSync, targetChainName),
  );
  // A large import of this tab, which shows its progress and has Stop. A
  // small one takes seconds, and the sync waits for it as before.
  let isWarpSyncImporting: boolean = $derived(
    warpState.status === "importing" && warpState.progress !== undefined,
  );
  let disabled: boolean = $derived(
    isSyncToggleDisabled({
      nodeStatus,
      isSyncTarget: targetChainSyncStatus.isSyncTarget,
      isToggleOn: toggleOn,
      syncStateText,
      isStarting,
      isSyncingInOtherTab,
      isWarpSyncImporting,
    }),
  );

  let iconProps: BaseIconProps = $derived({
    name: iconNameForSyncStateText(syncStateText),
    size: sizeSettings.navToggle,
    colorCategory: colorSettings.navToggleIcon,
    appendClass: classNames(toggleOn && "motion-safe:animate-spin"),
  });

  let tooltipText: string = $derived(
    isSyncingInOtherTab
      ? "syncing in another tab"
      : isStarting
        ? "starting sync"
        : // The toggle is already off: the contracts end what they do first.
          isStopping
          ? "stopping sync"
          : toggleOn
            ? "stop sync"
            : isWarpSyncImporting
              ? getSyncWaitsForImportText(warpState)
              : "start sync",
  );
</script>

<div class={classNames(isStopping && "motion-safe:animate-pulse")}>
  <BaseToggle
    toggleValue={toggleOn}
    size={sizeSettings.navToggle}
    {disabled}
    {tooltipText}
    tooltipXPosition="right"
    tooltipYPosition="bottom"
    colorCategoryTrack={colorSettings.navButton}
    colorCategoryThumbToggleOff={disabled
      ? colorSettings.navBg
      : colorSettings.navToggleOff}
    colorCategoryThumbToggleOn={colorSettings.navToggleOn}
    {iconProps}
    ontogglechanged={toggleChanged}
  />
</div>
