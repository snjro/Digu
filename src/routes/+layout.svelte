<script lang="ts">
  import { colorClasses } from "#lib/appearanceConfig/color/colorVariables.js";
  import { browser } from "$app/env";
  import { onNavigate, type OnNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { breakPointWidths } from "#lib/appearanceConfig/size/sizeDefinitions.js";
  import BaseSnackbar from "#lib/base/BaseSnackbar.svelte";
  import Breadcrumb from "#lib/breadcrumb/Breadcrumb.svelte";
  import { getUrlChainNameToSave } from "#lib/common/urlChainName.js";
  import { saveSelectedChainName } from "#lib/leftSidebar/Header/selectChain.js";
  import LeftSidebar from "#lib/leftSidebar/LeftSidebar.svelte";
  import Nav from "#lib/nav/Nav.svelte";
  import WarpSyncConfirmDialog from "#lib/nav/WarpSyncConfirmDialog.svelte";
  import { storeNoDbCurrentWidth } from "#stores/storeNoDb.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import { getScreenWidth } from "#utils/utilsDom.js";
  import classNames from "classnames";
  import LoadingSpinner from "./LoadingSpinner.svelte";
  import { capitalizeFirstLetter } from "#utils/utilsCommon.js";
  import { customLogger } from "#utils/logger.js";
  import { PROJECT_NAME } from "#utils/utilsConstants.js";
  import { untrack, type Snippet } from "svelte";
  import { TARGET_CHAINS } from "#constants/chains/_index.js";
  import { startWarpSync } from "#warpSync/warpSync.js";

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();

  $effect.pre(() => {
    if (browser) {
      if ($storeUserSettings.themeColor === "dark") {
        window.document.documentElement.classList.add("dark");
      } else {
        window.document.documentElement.classList.remove("dark");
      }
    }
  });

  // Save the chain in the URL so the sidebar and the nav follow it.
  $effect(() => {
    const paramsChainName: string | undefined = page.params.chainName;
    // Rerun only when the URL changes. SelectChain saves before it navigates.
    const chainNameToSave = untrack(() =>
      getUrlChainNameToSave(
        paramsChainName,
        $storeUserSettings.selectedChainName,
      ),
    );
    if (chainNameToSave !== undefined) {
      saveSelectedChainName(chainNameToSave).catch((error: unknown) => {
        customLogger.error("Save the chain in the URL.", error);
      });
    }
  });

  // Import the warp sync snapshot of the chain in the URL. Only when the
  // chain changes: not on each page of the same chain.
  let urlChainName: string | undefined = $derived(page.params.chainName);
  $effect(() => {
    const paramsChainName: string | undefined = urlChainName;
    const targetChain = TARGET_CHAINS.find(
      (chain) => chain.name === paramsChainName,
    );
    if (targetChain) void startWarpSync(targetChain);
  });

  function onResize(): void {
    storeNoDbCurrentWidth.set(getScreenWidth());
  }

  onNavigate((navigation: OnNavigate) => {
    if (typeof document.startViewTransition !== "function") return;
    // Adding the tab hash (PageWrapper) does not change the screen,
    // and a new view transition would skip the one of the page change.
    const { from, to } = navigation;
    if (
      from?.url.hash === "" &&
      from.url.pathname === to?.url.pathname &&
      from.url.search === to.url.search
    )
      return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<svelte:window onresize={onResize} />
<svelte:head>
  <title>{capitalizeFirstLetter(PROJECT_NAME)}</title>
</svelte:head>
<div
  class={classNames(
    "flex",
    "flex-row",
    "h-screen w-screen",
    // Keeps the hidden tooltips of the sidebar (absolute on a narrow screen)
    // from widening the page.
    "relative overflow-x-clip",
    colorClasses[colorSettings.main].bg,
    colorClasses[colorSettings.main].text,
  )}
>
  <LoadingSpinner />
  <LeftSidebar />
  <div
    class={classNames(
      "min-w-0 flex-auto",
      "flex flex-col",
      $storeUserSettings.isOpenSidebar &&
        $storeNoDbCurrentWidth <= breakPointWidths.sm &&
        "blur-xs pointer-events-none",
    )}
  >
    <Nav />
    <WarpSyncConfirmDialog />
    <main
      class={classNames(
        "min-h-0 flex-auto",
        "flex flex-col",
        "h-full w-full",
        "px-3 pb-1.5",
        "",
      )}
    >
      <Breadcrumb />
      {@render children?.()}
      <BaseSnackbar />
    </main>
  </div>
</div>
