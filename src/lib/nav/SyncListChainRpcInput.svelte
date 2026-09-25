<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import BaseInput from "$lib/base/BaseInput.svelte";
  import { changeSize } from "$lib/base/baseSizes";
  import type { Chain } from "@constants/chains/types";
  import type { NodeStatus, RpcInputType } from "@db/dbTypes";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeRpcSettings } from "@stores/storeRpcSettings";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utilsDb";
  import classNames from "classnames";
  import { untrack } from "svelte";
  import SyncListChainRpcInputHelperLabel from "./SyncListChainRpcInputHelperLabel.svelte";
  import type { HelperTextState } from "$lib/base/helperTextState";
  import {
    blurOnEnter,
    clearSucceededNodeStatus,
    toggleRpcInputType,
    updateRpc,
  } from "./rpcInput";

  let targetChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
  let rpc = $derived($storeRpcSettings[targetChainName].rpc);
  let nodeStatus: NodeStatus = $derived(
    $storeChainStatus[targetChainName].nodeStatus,
  );
  let helperTextState = $derived((): HelperTextState => {
    switch (nodeStatus) {
      case "SUCCESS":
        return "success";
      case "CONNECTING":
        return "indeterminate";
      case undefined:
        return undefined;
      default:
        return "error";
    }
  });
  $effect.pre(() => {
    if (targetChainName) {
      const targetChain: Chain = getTargetChain({ chainName: targetChainName });
      // Rerun only when the chain changes, not when rpc changes.
      untrack(() => updateRpc(targetChain, rpc));
    }
  });
  async function focusRpc(): Promise<void> {
    await clearSucceededNodeStatus(targetChainName, nodeStatus);
  }
  async function blurRpc(event: Event): Promise<void> {
    const newRpc: string = (event.target as HTMLInputElement).value;
    const targetChain: Chain = getTargetChain({ chainName: targetChainName });
    await updateRpc(targetChain, newRpc);
  }
  let inputType: RpcInputType = $derived(
    $storeRpcSettings[targetChainName].inputType,
  );
  let truncate: boolean = $derived(inputType === "text");
  let eyeIconName: BaseIconProps["name"] = $derived(
    inputType === "text" ? "eye" : "eyeOff",
  );
  let eyeIconTooltipText: "show" | "hide" = $derived(
    inputType === "text" ? "show" : "hide",
  );
  async function toggleInputType(): Promise<void> {
    await toggleRpcInputType(targetChainName, inputType);
  }
</script>

<div class={classNames("w-full", "max-w-2xl")}>
  <BaseInput
    colorCategory={colorSettings.navInput}
    colorCategoryBorder={colorSettings.navInput}
    type={inputType}
    value={rpc}
    size={sizeSettings.navInput}
    {truncate}
    disabled={$storeSyncStatus[targetChainName].isSyncing}
    helperTextState={helperTextState()}
    placeholder="http://localhost:8545"
    ariaLabel="RPC URL"
    onfocus={focusRpc}
    onblur={blurRpc}
    onkeydown={blurOnEnter}
  >
    {#snippet prefixIcon()}
      <BaseIcon
        name="networkOutline"
        size={sizeSettings.navInput}
        colorCategory={colorSettings.navInput}
      />
    {/snippet}
    {#snippet suffixIcon()}
      <BaseButtonIcon
        onclick={toggleInputType}
        size={changeSize(sizeSettings.navInput, -1)}
        tooltipText={eyeIconTooltipText}
        tooltipXPosition="right"
        tooltipYPosition="bottom"
        iconName={eyeIconName}
        colorCategoryFront={colorSettings.navButton}
        colorCategoryBg={colorSettings.navButton}
      />
    {/snippet}
    {#snippet inputHelper()}
      <SyncListChainRpcInputHelperLabel />
    {/snippet}
  </BaseInput>
</div>
