<script lang="ts">
  import BaseInput, { type BaseInputProps } from "$lib/base/BaseInput.svelte";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { storeLogSettings } from "@stores/storeLogSettings";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import SyncListChainRpcInputHelperLabel from "./SyncListChainRpcInputHelperLabel.svelte";
  import {
    getAndUpdateLatestBlockNumber,
    getNodeProvider,
    type NodeProvider,
  } from "@utils/utilsEthers";
  import { updateDbItemLogSettings } from "@db/dbSettingsDataHandlers";
  import { updateDbItemChainStatus } from "@db/dbChainStatusDataHandlers";
  import type { ChainName } from "@constants/chains/types";
  import classNames from "classnames";
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { myLogger } from "@utils/logger";
  import {
    countupNodeErrorCount,
    resetNodeErrorCount,
  } from "@eventLogs/eventLogsContract";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { changeSize } from "$lib/base/baseSizes";
  import type { HelperTextState } from "./settings/rpcConfig/RpcConfigChanger.svelte";
  import type { NodeStatus } from "@db/dbTypes";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  $: targetChainName = $storeUserSettings.selectedChainName.toString();
  $: rpc = $storeLogSettings[targetChainName].rpc;
  let nodeStatus: NodeStatus;
  $: nodeStatus = $storeChainStatus[targetChainName].nodeStatus;
  let nodeProvider: NodeProvider | undefined;
  let intervalId: number | undefined = undefined;
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
    stopPeriodicallyUpdateLatestBlockNumber(intervalId);
    await updateDbItemLogSettings(chainName, "rpc", newRpc);
    nodeProvider = await getNodeProvider(targetChainName, newRpc);
    if (nodeStatus === "SUCCESS" && nodeProvider) {
      // start updating latest blocknumber
      await startPeriodicallyUpdateLatestBlockNumber();
    }
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
  async function startPeriodicallyUpdateLatestBlockNumber(): Promise<void> {
    const blockIntervalMs: number =
      $storeLogSettings[targetChainName].blockIntervalMs;
    let latestBlockNumber: number;
    myLogger.info("START Periodically update latest blocknumber");
    intervalId = window.setInterval(async () => {
      latestBlockNumber = 0;
      console.log("intervalId", intervalId);
      if (nodeStatus === "SUCCESS" && nodeProvider) {
        try {
          latestBlockNumber = await getAndUpdateLatestBlockNumber(
            nodeProvider,
            targetChainName
          );
        } catch (error) {
          myLogger.error(
            "error on periodicallyUpdateLatestBlockNumber:",
            error
          );
          if (
            await countupNodeErrorCount(
              targetChainName,
              "periodicallyUpdateLatestBlockNumber"
            )
          ) {
            stopPeriodicallyUpdateLatestBlockNumber(intervalId);
          }
        }
        if (latestBlockNumber) {
          await resetNodeErrorCount(targetChainName);
        }
      } else {
        stopPeriodicallyUpdateLatestBlockNumber(intervalId);
      }
    }, blockIntervalMs);
  }
  function stopPeriodicallyUpdateLatestBlockNumber(
    intervalId: number | undefined
  ) {
    myLogger.info("STOPPED Periodically update latest blocknumber");
    window.clearInterval(intervalId);
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
