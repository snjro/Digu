<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import BaseInput from "$lib/base/BaseInput.svelte";
  import { changeSize } from "$lib/base/baseSizes";
  import type { Chain } from "@constants/chains/types";
  import { updateDbItemChainStatus } from "@db/dbChainStatusDataHandlers";
  import type { NodeStatus, RpcInputType } from "@db/dbTypes";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeRpcSettings } from "@stores/storeRpcSettings";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getNodeProvider } from "@utils/utilsEthers";
  import { getTargetChain } from "@utils/utlisDb";
  import classNames from "classnames";
  import { untrack } from "svelte";
  import SyncListChainRpcInputHelperLabel from "./SyncListChainRpcInputHelperLabel.svelte";
  import type { HelperTextState } from "./settings/rpcConfig/RpcConfigChanger.svelte";
  import { updateDbItemRpcSettings } from "@db/dbSettings";

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
      // Rerun only when the chain changes, not when rpc (the default argument) changes.
      untrack(() => updateRpc(targetChain));
    }
  });
  async function updateRpc(
    targetChain: Chain,
    newRpc: string = rpc,
  ): Promise<void> {
    await updateDbItemRpcSettings(targetChain.name, "rpc", newRpc);

    //By calling "getNodeProvider", nodeStatus is updated
    await getNodeProvider(targetChain, newRpc);
  }
  async function focusRpc(): Promise<void> {
    if (nodeStatus === "SUCCESS") {
      await updateDbItemChainStatus(targetChainName, "nodeStatus", undefined);
    }
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
    const newInputType: RpcInputType =
      inputType === "text" ? "password" : "text";
    await updateDbItemRpcSettings(targetChainName, "inputType", newInputType);
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
    placeholder="https://localhost:8545"
    onfocus={focusRpc}
    onblur={blurRpc}
  >
    <BaseIcon
      slot="prefixIcon"
      name="networkOutline"
      size={sizeSettings.navInput}
      colorCategory={colorSettings.navInput}
    />
    <BaseButtonIcon
      slot="suffixIcon"
      onclick={toggleInputType}
      size={changeSize(sizeSettings.navInput, -1)}
      tooltipText={eyeIconTooltipText}
      tooltipXPosition="right"
      tooltipYPosition="bottom"
      iconName={eyeIconName}
      colorCategoryFront={colorSettings.navButton}
      colorCategoryBg={colorSettings.navButton}
    />
    <SyncListChainRpcInputHelperLabel slot="inputHelper" />
  </BaseInput>
</div>
