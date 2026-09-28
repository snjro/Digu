<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseCheckbox from "$lib/base/BaseCheckbox.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import { storeRpcSettings } from "@stores/storeRpcSettings";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utilsDb";
  import {
    hasWarpSync,
    selectWarpSyncState,
    storeWarpSync,
  } from "@warpSync/warpSyncState";
  import classNames from "classnames";
  import { getWarpSyncHelperText, updateWarpSync } from "./warpSyncSetting";

  let targetChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
  let targetChain = $derived(getTargetChain({ chainName: targetChainName }));
  let isOn: boolean = $derived($storeRpcSettings[targetChainName].warpSync);
  // Bound to the checkbox, because a change sets it before the save. After a
  // failed save the store does not change, so set the saved value again.
  let checked: boolean = $derived(isOn);
  let helperText: string = $derived(
    getWarpSyncHelperText(
      isOn,
      selectWarpSyncState($storeWarpSync, targetChainName),
    ),
  );

  async function change(): Promise<void> {
    const isSaved: boolean = await updateWarpSync(targetChain, checked);
    if (!isSaved) checked = isOn;
  }
</script>

{#if hasWarpSync(targetChainName)}
  <CommonItemMember text="Warp sync">
    <div class={classNames("flex", "flex-row", "items-center", "space-x-2")}>
      <BaseCheckbox
        bind:checked
        size={sizeSettings.navSettings}
        onchange={change}
        ariaLabel="Warp sync"
      />
      <BaseLabel
        text={helperText}
        textSize={sizeSettings.navInputHelperText}
        truncate={false}
      />
    </div>
  </CommonItemMember>
{/if}
