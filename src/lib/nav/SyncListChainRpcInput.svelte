<script lang="ts">
  import BaseInput, { type BaseInputProps } from "$lib/base/BaseInput.svelte";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { storeRpcSettings } from "@stores/storeRpcSettings";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import SyncListChainRpcInputHelperLabel from "./SyncListChainRpcInputHelperLabel.svelte";
  import { updateDbItemRpcSettings } from "@db/dbSettingsDataHandlers";
  import { updateDbItemChainStatus } from "@db/dbChainStatusDataHandlers";
  import type { ChainName } from "@constants/chains/types";
  import classNames from "classnames";
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { changeSize } from "$lib/base/baseSizes";
  import type { HelperTextState } from "./settings/rpcConfig/RpcConfigChanger.svelte";
  import type { NodeStatus } from "@db/dbTypes";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { getNodeProvider } from "@utils/utilsEthers";

  $: targetChainName = $storeUserSettings.selectedChainName.toString();
  $: rpc = $storeRpcSettings[targetChainName].rpc;
  let nodeStatus: NodeStatus;
  $: nodeStatus = $storeChainStatus[targetChainName].nodeStatus;
  $: helperTextState = (): HelperTextState => {
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
  };
  $: {
    if (targetChainName) {
      updateRpc(targetChainName);
    }
  }
  async function updateRpc(
    chainName: ChainName,
    newRpc: string = rpc
  ): Promise<void> {
    await updateDbItemRpcSettings(chainName, "rpc", newRpc);

    //By calling "getNodeProvider", nodeStatus is updated
    await getNodeProvider(targetChainName, newRpc);
  }
  async function focusRpc(): Promise<void> {
    if (nodeStatus === "SUCCESS") {
      await updateDbItemChainStatus(targetChainName, "nodeStatus", undefined);
    }
  }
  async function blurRpc(event: Event): Promise<void> {
    const newRpc: string = (event.target as HTMLInputElement).value;
    await updateRpc(targetChainName, newRpc);
  }
  let inputType: BaseInputProps["type"] = "text";
  let truncate = true;
  let eyeIconName: BaseIconProps["name"] = "eyeOff";
  let eyeIconTooltipText: "show" | "hide" = "hide";
  function toggleObscureText(): void {
    if (inputType === "text") {
      inputType = "password";
      truncate = false;
      eyeIconName = "eye";
      eyeIconTooltipText = "show";
    } else {
      inputType = "text";
      truncate = true;
      eyeIconName = "eyeOff";
      eyeIconTooltipText = "hide";
    }
  }
</script>

<div class={classNames("w-96", "w-full", "flex", "flex-row", "h-fit")}>
  <BaseInput
    colorCategory={colorSettings.navInput}
    colorCategoryBorder={colorSettings.navInput}
    type={inputType}
    value={rpc}
    size={sizeSettings.navInput}
    {truncate}
    disabled={$storeSyncStatus[targetChainName].isSyncing}
    helperTextState={helperTextState()}
    placeholder="Enter URL of RPC"
    on:focus={focusRpc}
    on:blur={blurRpc}
  >
    <BaseIcon
      slot="prefixIcon"
      name="networkOutline"
      size={sizeSettings.navInput}
      colorCategory={colorSettings.navInput}
    />
    <BaseButtonIcon
      slot="suffixIcon"
      on:click={toggleObscureText}
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
