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
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utlisDb";
  import classNames from "classnames";

  let toggleOn: boolean = false;
  $: {
    if (syncStateText === "stopped") toggleOn = false;
  }

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

  let syncStateText: SyncStateText;
  $: syncStateText = $storeSyncStatus[targetChainName].syncStateText;

  let isAbleToSync: boolean;
  $: isAbleToSync =
    nodeStatus === "SUCCESS" && targetChainSyncStatus.isSyncTarget;
  let isStopping: boolean;
  $: isStopping = syncStateText === "stopping";
  let disabled: boolean;
  $: disabled = !isAbleToSync || isStopping;

  let iconProps: BaseIconProps;
  $: iconProps = {
    name: iconNameForSyncStateText(syncStateText),
    size: sizeSettings.navToggle,
    colorCategory: colorSettings.navToggleIcon,
    appendClass: classNames(toggleOn && "animate-spin"),
  };

  let tooltipText: string;
  $: tooltipText = toggleOn ? "stop sync" : "start sync";
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
    on:toggleChanged={toggleChanged}
  />
</div>
