<script lang="ts">
  import PageWrapperContent from "#lib/PageWrapper/PageWrapperContent.svelte";
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseButton from "#lib/base/BaseButton.svelte";
  import BaseDialog from "#lib/base/BaseDialog/BaseDialog.svelte";
  import {
    closeDialog,
    openDialog,
  } from "#lib/base/BaseDialog/BaseDialogHandler.js";
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import type { BaseSnackbarProps } from "#lib/base/snackbarProps.js";
  import CommonItemMember from "#lib/common/CommonItemMember.svelte";
  import type { Chain, ChainName } from "#constants/chains/types.js";
  import { storeSyncLockedByOtherTab } from "#eventLogs/syncLock.js";
  import {
    resetSyncedData,
    type SyncResetOutcome,
  } from "#eventLogs/syncReset.js";
  import { storeNoDbSnackBar } from "#stores/storeNoDb.js";
  import { storeRpcSettings } from "#stores/storeRpcSettings.js";
  import { storeSyncStatus } from "#stores/storeSyncStatus.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import { numberWithCommas } from "#utils/utilsCommon.js";
  import { getTargetChain } from "#utils/utilsDb.js";
  import {
    hasWarpSync,
    isWarpSyncRunning,
    selectWarpSyncState,
    storeWarpSync,
  } from "#warpSync/warpSyncState.js";
  import classNames from "classnames";
  import {
    countSyncedLogs,
    getImportResultLine,
    getResetConfirmationTexts,
    getResetDisabledReason,
    getResetResultLines,
    getResetSnackBar,
    type ResetResultLine,
    WAIT_UNTIL_THE_SYNC_STOPS,
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
      isImporting: isWarpSyncRunning(
        selectWarpSyncState($storeWarpSync, targetChainName),
      ),
      isResetting,
    }),
  );
  let confirmationTexts: string[] = $derived(
    getResetConfirmationTexts(targetChain.fullName, logCount, isWarpSyncOn),
  );

  let dialogElement = $state<HTMLDialogElement>();
  // undefined until Reset is pressed in the dialog, which then shows these
  // lines instead of the confirmation.
  let resultLines: ResetResultLine[] | undefined = $state(undefined);
  // A reset whose dialog was closed does not write into the next one.
  let run: number = 0;

  async function reset(): Promise<void> {
    const thisRun: number = ++run;
    const chain: Chain = targetChain;
    isResetting = true;
    resultLines = [{ text: "Resetting…", isError: false }];
    // Resolves "busy" instead of deleting while the chain is synced.
    const outcome: SyncResetOutcome = await resetSyncedData(chain);
    isResetting = false;
    if (thisRun !== run) {
      // The dialog was closed, so the snackbar tells a failure.
      const snackBar: BaseSnackbarProps | undefined = getResetSnackBar(
        outcome.result,
      );
      if (snackBar) $storeNoDbSnackBar = snackBar;
      return;
    }
    const lines: ResetResultLine[] = getResetResultLines(
      outcome,
      chain.fullName,
    );
    resultLines = lines;
    if (outcome.result !== "reset" || !outcome.warpSyncImport) return;
    await outcome.warpSyncImport;
    if (thisRun !== run) return;
    resultLines = [
      lines[0],
      getImportResultLine(
        selectWarpSyncState($storeWarpSync, chain.name),
        numberWithCommas(countSyncedLogs($storeSyncStatus[chain.name])),
      ),
    ];
  }
  function forgetResult(): void {
    run += 1;
    resultLines = undefined;
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
      onclick={() => openDialog(dialogElement)}
    />
    <!-- As text, not a tooltip: a touch screen has no hover. -->
    {#if disabledReason}
      <BaseLabel
        text={disabledReason}
        textSize={sizeSettings.navInputHelperText}
        colorCategoryFront={colorSettings.navSettings}
        truncate={false}
        appendClass={disabledReason === WAIT_UNTIL_THE_SYNC_STOPS
          ? "motion-safe:animate-pulse"
          : undefined}
      />
    {/if}
  </div>
</CommonItemMember>
<BaseDialog
  bind:dialogElement
  headerText={`Reset the sync of ${targetChain.fullName}${resultLines ? "" : "?"}`}
  onclose={forgetResult}
>
  {#snippet dialogBody()}
    <PageWrapperContent hasMultipleTabs={false} gridCols="grid-cols-1">
      {#snippet PageWrapperContentBody()}
        <div
          class={classNames("flex", "flex-col", "space-y-2", "max-w-md", "p-2")}
        >
          {#if !resultLines}
            {#each confirmationTexts as confirmationText (confirmationText)}
              <BaseLabel
                text={confirmationText}
                textSize={sizeSettings.dialogBodyContent}
                colorCategoryFront={colorSettings.dialogBody}
                truncate={false}
              />
            {/each}
          {/if}
          <!-- Always there, so that a screen reader reads each new line. -->
          <div
            role="status"
            aria-live="polite"
            class={classNames("flex", "flex-col", "space-y-2")}
          >
            {#each resultLines ?? [] as resultLine, index (index)}
              <BaseLabel
                text={resultLine.text}
                textSize={sizeSettings.dialogBodyContent}
                colorCategoryFront={resultLine.isError
                  ? "error"
                  : colorSettings.dialogBody}
                truncate={false}
              />
            {/each}
          </div>
          <div
            class={classNames(
              "flex",
              "flex-row",
              "justify-end",
              "space-x-2",
              "pt-2",
            )}
          >
            {#if resultLines}
              <!-- The reset and the import go on after it is closed. -->
              <BaseButton
                label="Close"
                size={sizeSettings.dialogFooter}
                border
                onclick={() => closeDialog(dialogElement)}
              />
            {:else}
              <BaseButton
                label="Cancel"
                size={sizeSettings.dialogFooter}
                border
                onclick={() => closeDialog(dialogElement)}
              />
              <BaseButton
                label="Reset"
                size={sizeSettings.dialogFooter}
                colorCategoryFront="white"
                colorCategoryBg="error"
                onclick={reset}
              />
            {/if}
          </div>
        </div>
      {/snippet}
    </PageWrapperContent>
  {/snippet}
</BaseDialog>
