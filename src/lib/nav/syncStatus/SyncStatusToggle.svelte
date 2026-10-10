<script lang="ts">
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import type { BaseIconProps } from "#lib/base/BaseIcon.js";
  import BaseToggle from "#lib/base/BaseToggle.svelte";
  import { iconNameForSyncStateText } from "#lib/common/CommonSyncStateText.svelte";
  import { showSnackBarAsSaveFailed } from "#lib/common/saveFailed.js";
  import type { Chain, ChainName } from "#constants/chains/types.js";
  import type {
    ChainStatus,
    NodeStatus,
    SyncStateText,
    SyncStatus,
  } from "#db/dbTypes.js";
  import { fetchEventLogs } from "#eventLogs/eventLogs.js";
  import { stopSync } from "#eventLogs/syncStop.js";
  import {
    storeChainActivity,
    type ChainActivity,
  } from "#eventLogs/chainActivity.js";
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
  import { isSyncToggleDisabled } from "../chainControls";

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
        await stopSync(targetChain.name);
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

  let activity: ChainActivity = $derived($storeChainActivity[targetChainName]);
  let warpState: WarpSyncState = $derived(
    selectWarpSyncState($storeWarpSync, targetChainName),
  );
  let disabled: boolean = $derived(
    isSyncToggleDisabled(activity, {
      nodeStatus,
      isSyncTarget: targetChainSyncStatus.isSyncTarget,
      isToggleOn: toggleOn,
      isStarting,
    }),
  );

  let iconProps: BaseIconProps = $derived({
    name: iconNameForSyncStateText(syncStateText),
    size: sizeSettings.navToggle,
    colorCategory: colorSettings.navToggleIcon,
    appendClass: classNames(toggleOn && "motion-safe:animate-spin"),
  });

  let tooltipText: string = $derived(
    activity === "otherTab"
      ? "in use in another tab"
      : isStarting
        ? "starting sync"
        : // The toggle is already off: the contracts end what they do first.
          activity === "stopping"
          ? "stopping sync"
          : activity === "resetting"
            ? "resetting"
            : toggleOn
              ? "stop sync"
              : // A large import of this tab, which shows its progress and
                // has Stop. A small one takes seconds, and the sync waits
                // for it as before.
                activity === "largeImport"
                ? getSyncWaitsForImportText(warpState)
                : "start sync",
  );
</script>

<div class={classNames(activity === "stopping" && "motion-safe:animate-pulse")}>
  <BaseToggle
    toggleValue={toggleOn}
    size={sizeSettings.navToggle}
    {disabled}
    ariaLabel="Sync"
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
