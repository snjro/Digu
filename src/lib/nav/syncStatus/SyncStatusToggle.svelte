<script lang="ts">
  import BaseToggle from "$lib/base/BaseToggle.svelte";
  import type { Chain, ChainName } from "@constants/chains/types";
  import { startAbortingInChain } from "@db/dbEventLogsDataHandlersSyncStatus";
  import type { ChainStatus, NodeStatus, SyncStatus } from "@db/dbTypes";
  import { fetchEventLogs } from "@eventLogs/eventLogs";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utlisDb";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import CommonSyncCurrentState, {
    iconNameForCurrentSyncingState,
    type CurrentSyncingState,
  } from "$lib/common/CommonSyncCurrentState.svelte";
  import classNames from "classnames";

  let toggleOn: boolean = false;
  let targetChainName: ChainName;
  $: targetChainName = $storeUserSettings.selectedChainName.toString();

  let targetChain: Chain;
  $: targetChain = getTargetChain({
    chainName: targetChainName,
  });

  let chainStatus: ChainStatus;
  $: chainStatus = $storeChainStatus[targetChainName];

  let nodeStatus: NodeStatus;
  $: nodeStatus = chainStatus.nodeStatus;

  let targetChainSyncStatus: SyncStatus;
  $: targetChainSyncStatus = $storeSyncStatus[targetChainName];

  const toggleChanged = async (): Promise<void> => {
    toggleOn = !toggleOn;
    if (toggleOn) {
      fetchEventLogs(targetChain);
    } else {
      await startAbortingInChain(targetChain.name);
    }
  };

  let currentSyncingState: CurrentSyncingState;

  let isAbleToSync: boolean;
  $: isAbleToSync =
    nodeStatus === "SUCCESS" && targetChainSyncStatus.isSyncTarget;
  let disabled: boolean;
  $: disabled = !isAbleToSync || currentSyncingState === "Stopping...";

  $: (async () => {
    if (currentSyncingState === "Stopped") {
      toggleOn = false;
    }
  })();
</script>

<div
  class={classNames("flex", "flex-row", "items-center", "space-x-0.5", "w-32")}
>
  <BaseToggle
    toggleValue={toggleOn}
    size={sizeSettings.navToggle}
    {disabled}
    iconName={iconNameForCurrentSyncingState(currentSyncingState)}
    tooltipText="syncing on/off"
    tooltipXPosition="right"
    tooltipYPosition="bottom"
    colorCategoryTrack={colorSettings.navButton}
    colorCategoryThumbToggleOff={disabled ? colorSettings.navBg : "interactive"}
    colorCategoryThumbToggleOn="success"
    spinIcon={toggleOn}
    on:toggleChanged={toggleChanged}
  />
  <CommonSyncCurrentState
    colorCategoryFront={colorSettings.navText}
    size={sizeSettings.navText}
    {targetChain}
    showIcon={false}
    bind:currentSyncingState
  />
</div>
