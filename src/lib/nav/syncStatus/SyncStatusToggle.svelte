<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseToggle from "$lib/base/BaseToggle.svelte";
  import { iconNameForSyncStateText } from "$lib/common/CommonSyncStateText.svelte";
  import type { Chain, ChainName } from "@constants/chains/types";
  import { startAbortingInChain } from "@db/dbEventLogsDataHandlersSyncStatus";
  import type {
    ChainStatus,
    NodeStatus,
    SyncStateText,
    SyncStatus,
  } from "@db/dbTypes";
  import { fetchEventLogs } from "@eventLogs/eventLogs";
  import { storeSyncLockedByOtherTab } from "@eventLogs/syncLock";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utlisDb";
  import classNames from "classnames";
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
      await startAbortingInChain(targetChain.name);
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
  let disabled: boolean = $derived(
    isSyncToggleDisabled({
      nodeStatus,
      isSyncTarget: targetChainSyncStatus.isSyncTarget,
      isToggleOn: toggleOn,
      syncStateText,
      isStarting,
      isSyncingInOtherTab,
    }),
  );

  let iconProps: BaseIconProps = $derived({
    name: iconNameForSyncStateText(syncStateText),
    size: sizeSettings.navToggle,
    colorCategory: colorSettings.navToggleIcon,
    appendClass: classNames(toggleOn && "animate-spin"),
  });

  let tooltipText: string = $derived(
    isSyncingInOtherTab
      ? "syncing in another tab"
      : isStarting
        ? "starting sync"
        : toggleOn
          ? "stop sync"
          : "start sync",
  );
</script>

<div class={classNames(isStopping && "animate-pulse")}>
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
