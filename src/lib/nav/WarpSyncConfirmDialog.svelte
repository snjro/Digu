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
  import { updateWarpSync } from "$lib/nav/settings/warpSyncSetting";
  import type { Chain } from "@constants/chains/types";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utilsDb";
  import { confirmWarpSync, declineWarpSync } from "@warpSync/warpSync";
  import {
    selectWarpSyncState,
    storeWarpSync,
    type WarpSyncState,
  } from "@warpSync/warpSyncState";
  import { getConfirmationTexts } from "@warpSync/warpSyncTexts";
  import classNames from "classnames";

  let targetChain: Chain = $derived(
    getTargetChain({
      chainName: $storeUserSettings.selectedChainName.toString(),
    }),
  );
  let warpState: WarpSyncState = $derived(
    selectWarpSyncState($storeWarpSync, targetChain.name),
  );
  let isAsking: boolean = $derived(warpState.status === "confirm");
  let dialogElement = $state<HTMLDialogElement>();
  // quota - usage, when the browser tells it.
  let freeBytes: number | undefined = $state(undefined);
  // Set by a button, so that closing the dialog is not "Not now".
  let answered: boolean = false;

  $effect(() => {
    if (!isAsking) {
      closeDialog(dialogElement);
      return;
    }
    answered = false;
    openDialog(dialogElement);
    void navigator.storage
      ?.estimate?.()
      .then(({ quota, usage }) => {
        if (quota !== undefined && usage !== undefined) {
          freeBytes = quota - usage;
        }
      })
      .catch(() => {});
  });

  let texts = $derived(
    getConfirmationTexts(targetChain.fullName, warpState, freeBytes),
  );

  function answer(run: () => void): void {
    answered = true;
    closeDialog(dialogElement);
    run();
  }
  // Escape, the backdrop or the close button: the same as "Not now".
  function onclose(): void {
    if (!answered && isAsking) declineWarpSync(targetChain.name);
  }
</script>

<BaseDialog bind:dialogElement headerText={texts.header} {onclose}>
  {#snippet dialogBody()}
    <PageWrapperContent hasMultipleTabs={false} gridCols="grid-cols-1">
      {#snippet PageWrapperContentBody()}
        <div
          class={classNames("flex", "flex-col", "space-y-2", "max-w-md", "p-2")}
        >
          {#each texts.lines as line (line)}
            <BaseLabel
              text={line}
              textSize={sizeSettings.dialogBodyContent}
              colorCategoryFront={colorSettings.dialogBody}
              truncate={false}
            />
          {/each}
          {#if texts.warning}
            <BaseLabel
              text={texts.warning}
              textSize={sizeSettings.dialogBodyContent}
              colorCategoryFront="error"
              truncate={false}
            />
          {/if}
          <div
            class={classNames(
              "flex",
              "flex-row",
              "flex-wrap",
              "justify-end",
              "gap-2",
              "pt-2",
            )}
          >
            <BaseButton
              label={`Turn off warp sync for ${targetChain.fullName}`}
              size={sizeSettings.dialogFooter}
              border
              onclick={() =>
                answer(() => {
                  declineWarpSync(targetChain.name);
                  void updateWarpSync(targetChain, false);
                })}
            />
            <BaseButton
              label="Not now"
              size={sizeSettings.dialogFooter}
              border
              onclick={() => answer(() => declineWarpSync(targetChain.name))}
            />
            <BaseButton
              label="Import"
              size={sizeSettings.dialogFooter}
              colorCategoryFront="white"
              colorCategoryBg="interactive"
              onclick={() => answer(() => void confirmWarpSync(targetChain))}
            />
          </div>
        </div>
      {/snippet}
    </PageWrapperContent>
  {/snippet}
</BaseDialog>
