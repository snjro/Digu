<script lang="ts">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseButton from "$lib/base/BaseButton.svelte";
  import BaseDialog from "$lib/base/BaseDialog/BaseDialog.svelte";
  import {
    closeDialog,
    openDialog,
  } from "$lib/base/BaseDialog/BaseDialogHandler";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import type { Chain, ChainName } from "@constants/chains/types";
  import { storeSyncLockedByOtherTab } from "@eventLogs/syncLock";
  import { resetSyncedData } from "@eventLogs/syncReset";
  import { storeNoDbSnackBar } from "@stores/storeNoDb";
  import { storeRpcSettings } from "@stores/storeRpcSettings";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { numberWithCommas } from "@utils/utilsCommon";
  import { getTargetChain } from "@utils/utilsDb";
  import {
    hasWarpSync,
    selectWarpSyncState,
    storeWarpSync,
  } from "@warpSync/warpSyncState";
  import classNames from "classnames";
  import {
    countSyncedLogs,
    getResetConfirmationTexts,
    getResetDisabledReason,
    getResetSnackBar,
  } from "./syncedData";

  let targetChainName: ChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
  let targetChain: Chain = $derived(
    getTargetChain({ chainName: targetChainName }),
  );
  let logCount: string = $derived(
    numberWithCommas(countSyncedLogs($storeSyncStatus[targetChainName])),
  );
  let isWarpSyncOn: boolean = $derived(
    hasWarpSync(targetChainName) && $storeRpcSettings[targetChainName].warpSync,
  );

  let isResetting: boolean = $state(false);
  let disabledReason: string | undefined = $derived(
    getResetDisabledReason({
      syncStateText: $storeSyncStatus[targetChainName].syncStateText,
      isSyncingInOtherTab: $storeSyncLockedByOtherTab[targetChainName],
      isImporting:
        selectWarpSyncState($storeWarpSync, targetChainName).status ===
        "importing",
      isResetting,
    }),
  );
  let confirmationTexts: string[] = $derived(
    getResetConfirmationTexts(targetChain.fullName, logCount, isWarpSyncOn),
  );

  let dialogElement = $state<HTMLDialogElement>();

  async function reset(): Promise<void> {
    isResetting = true;
    // Resolves "busy" instead of deleting while the chain is synced.
    const result = await resetSyncedData(targetChain);
    isResetting = false;
    closeDialog(dialogElement);
    $storeNoDbSnackBar = getResetSnackBar(result, targetChain.fullName);
  }
</script>

<CommonItemMember text="Event logs">
  <div class={classNames("flex", "flex-row", "items-center", "space-x-2")}>
    <BaseLabel
      text={`${logCount} logs`}
      textSize={sizeSettings.navSettings}
      colorCategoryFront={colorSettings.navSettings}
      truncate={false}
    />
    <BaseButton
      label="Reset"
      size={sizeSettings.navSettings}
      colorCategoryFront="white"
      colorCategoryBg="error"
      disabled={disabledReason !== undefined}
      tooltipText={disabledReason}
      onclick={() => openDialog(dialogElement)}
    />
  </div>
</CommonItemMember>
<BaseDialog
  bind:dialogElement
  headerText={`Reset the sync of ${targetChain.fullName}?`}
>
  {#snippet dialogBody()}
    <PageWrapperContent hasMultipleTabs={false} gridCols="grid-cols-1">
      {#snippet PageWrapperContentBody()}
        <div
          class={classNames("flex", "flex-col", "space-y-2", "max-w-md", "p-2")}
        >
          {#each confirmationTexts as confirmationText (confirmationText)}
            <BaseLabel
              text={confirmationText}
              textSize={sizeSettings.dialogBodyContent}
              colorCategoryFront={colorSettings.dialogBody}
              truncate={false}
            />
          {/each}
          <div
            class={classNames(
              "flex",
              "flex-row",
              "justify-end",
              "space-x-2",
              "pt-2",
            )}
          >
            <BaseButton
              label="Cancel"
              size={sizeSettings.dialogFooter}
              border
              disabled={isResetting}
              onclick={() => closeDialog(dialogElement)}
            />
            <BaseButton
              label={isResetting ? "Resetting…" : "Reset"}
              size={sizeSettings.dialogFooter}
              colorCategoryFront="white"
              colorCategoryBg="error"
              disabled={isResetting}
              onclick={reset}
            />
          </div>
        </div>
      {/snippet}
    </PageWrapperContent>
  {/snippet}
</BaseDialog>
