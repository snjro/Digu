<script lang="ts">
  import { colorClasses } from "#lib/appearanceConfig/color/colorVariables.js";
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { breakPointWidths } from "#lib/appearanceConfig/size/sizeDefinitions.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import { zIndex } from "#lib/appearanceConfig/zIndex.js";
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import CommonItemGroup from "#lib/common/CommonItemGroup.svelte";
  import type { Chain, ChainName } from "#constants/chains/types.js";
  import { storeSyncLockedByOtherTab } from "#eventLogs/syncLock.js";
  import { storeNoDbCurrentWidth } from "#stores/storeNoDb.js";
  import { storeSyncStatus } from "#stores/storeSyncStatus.js";
  import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import { getTargetChain } from "#utils/utilsDb.js";
  import classNames from "classnames";
  import SyncedData from "../settings/SyncedData.svelte";
  import WarpSyncConfig from "../settings/WarpSyncConfig.svelte";
  import {
    getShownSyncStoppedReason,
    getSyncPanelStateText,
    SYNC_PANEL_ID,
    type SyncPanelStateText,
  } from "./syncPanel";

  interface Props {
    open: boolean;
    // The button that opens it, which gets the focus back.
    triggerElement: HTMLElement | undefined;
  }

  let { open = $bindable(), triggerElement }: Props = $props();

  const headingId: string = `${SYNC_PANEL_ID}-heading`;

  let targetChainName: ChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
  let targetChain: Chain = $derived(
    getTargetChain({ chainName: targetChainName }),
  );
  let stateText: SyncPanelStateText | undefined = $derived.by(() => {
    const syncStateText = $storeSyncStatus[targetChainName].syncStateText;
    const isSyncingInOtherTab: boolean =
      $storeSyncLockedByOtherTab[targetChainName];
    return getSyncPanelStateText(
      syncStateText,
      isSyncingInOtherTab,
      getShownSyncStoppedReason(
        syncStateText,
        isSyncingInOtherTab,
        $storeSyncStoppedReason[targetChainName],
      ),
    );
  });
  let isNarrow: boolean = $derived(
    $storeNoDbCurrentWidth <= breakPointWidths.sm,
  );

  let panelElement: HTMLElement | undefined = $state();
  let headingElement: HTMLElement | undefined = $state();
  $effect(() => {
    if (open) headingElement?.focus();
  });

  // Not a held key, nor Escape in an IME, which cancels the composition.
  function onKeydown(event: KeyboardEvent): void {
    if (!open || event.key !== "Escape" || event.repeat || event.isComposing) {
      return;
    }
    // Escape closes a dialog of the panel first.
    if (document.querySelector("dialog[open]")) return;
    open = false;
    triggerElement?.focus();
  }
  // Not the focus: it goes where the click was.
  // In the capture phase: the button pressed can go on the click (Import, or
  // Reset in its dialog), and then neither the bubble phase nor its
  // composedPath() has the panel or the dialog.
  function onClick(event: MouseEvent): void {
    if (!open) return;
    const path: EventTarget[] = event.composedPath();
    if (
      (panelElement && path.includes(panelElement)) ||
      (triggerElement && path.includes(triggerElement))
    ) {
      return;
    }
    // The dialogs of Reset and of the import of the warp sync.
    if (path.some((node) => node instanceof HTMLDialogElement)) return;
    open = false;
  }

  // As the dialogs: a shadow in the light theme, a border in the dark theme.
  const shadowStyle: string = classNames(
    "shadow-sm",
    "dark:shadow-none",
    "dark:border",
    colorClasses[colorSettings.dialogHeader].shadow,
    colorClasses[colorSettings.dialogHeader].border,
  );
</script>

<svelte:document onkeydown={onKeydown} onclickcapture={onClick} />

<!-- Over the page, without trapping the focus, so not a dialog. -->
<div
  bind:this={panelElement}
  id={SYNC_PANEL_ID}
  role="region"
  aria-labelledby={headingId}
  class={classNames(
    !open && "hidden",
    "absolute",
    "top-full",
    zIndex.syncPanel,
    // Not over the open sidebar: at most as wide as the nav, less right-3.
    isNarrow
      ? "inset-x-0"
      : ["right-3", "w-[400px]", "max-w-[calc(100%-1.5rem)]"],
    "rounded-sm",
    shadowStyle,
    colorClasses[colorSettings.dialogHeader].bg,
  )}
>
  <div
    class={classNames(
      "p-1.5",
      "border-b",
      colorClasses[colorSettings.dialogHeader].border,
    )}
  >
    <h2 bind:this={headingElement} id={headingId} tabindex="-1">
      <BaseLabel
        text={`Sync of ${targetChain.fullName}`}
        textSize={sizeSettings.dialogHeader}
        colorCategoryFront={colorSettings.dialogHeader}
      />
    </h2>
  </div>
  <div class={classNames("p-2")}>
    <CommonItemGroup gridTrack="">
      <!-- The one place that reads out the state. Always there, so that a
      screen reader reads each change. -->
      <div role="status" aria-live="polite">
        {#if stateText}
          <BaseLabel
            prefixIcon={stateText.isError
              ? { name: "close", colorCategory: "error" }
              : undefined}
            text={stateText.text}
            textSize={sizeSettings.navSettings}
            colorCategoryFront={stateText.isError
              ? "error"
              : colorSettings.navSettings}
            truncate={false}
          />
        {/if}
      </div>
      <WarpSyncConfig />
      <SyncedData />
    </CommonItemGroup>
  </div>
</div>
