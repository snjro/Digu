<script lang="ts">
  import BaseToggle from "$lib/base/BaseToggle.svelte";
  import type { Chain, ChainName } from "@constants/chains/types";
  import { startAbortingInChain } from "@db/dbEventLogsDataHandlersSyncStatus";
  import type { NodeStatus, SyncStatus } from "@db/dbTypes";
  import { fetchEventLogs } from "@eventLogs/eventLogs";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utlisDb";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { storeSyncStatus } from "@stores/storeSyncStatus";

  let toggleOn: boolean = false;
  let targetChainName: ChainName;
  $: targetChainName = $storeUserSettings.selectedChainName.toString();
  let targetChain: Chain;
  $: targetChain = getTargetChain({
    chainName: targetChainName,
  });
  let nodeStatus: NodeStatus;
  $: nodeStatus = $storeChainStatus[targetChainName].nodeStatus;

  let targetChainSyncStatus: SyncStatus;
  $: targetChainSyncStatus = $storeSyncStatus[targetChainName];
  const toggleChanged = (): void => {
    toggleOn = !toggleOn;
    if (toggleOn) {
      fetchEventLogs(targetChain);
    } else {
      startAbortingInChain(targetChain.name);
    }
  };
  $: {
  }
  let disabled: boolean;
  $: disabled = nodeStatus !== "SUCCESS" || !targetChainSyncStatus.isSyncTarget;
</script>

<BaseToggle
  toggleValue={toggleOn}
  size={sizeSettings.navToggle}
  {disabled}
  iconNameToggleOn="sync"
  iconNameToggleOff={disabled ? undefined : "pause"}
  tooltipText="syncing on/off"
  tooltipXPosition="right"
  tooltipYPosition="bottom"
  colorCategoryTrack={colorSettings.navButton}
  colorCategoryThumbToggleOff={disabled ? colorSettings.navBg : "interactive"}
  colorCategoryThumbToggleOn="success"
  spinIcon={toggleOn}
  on:toggleChanged={toggleChanged}
/>
