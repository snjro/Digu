<script lang="ts">
  import { browser } from "$app/environment";
  import { onNavigate } from "$app/navigation";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { breakPointWidths } from "$lib/appearanceConfig/size/sizeDefinitions";
  import BaseSnackbar from "$lib/base/BaseSnackbar.svelte";
  import Breadcrumb from "$lib/breadcrumb/Breadcrumb.svelte";
  import LeftSidebar from "$lib/leftSidebar/LeftSidebar.svelte";
  import Nav from "$lib/nav/Nav.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import type { OnNavigate } from "@sveltejs/kit";
  import { getScreenWidth } from "@utils/utilsDom";
  import classNames from "classnames";
  import LoadingSpinner from "./LoadingSpinner.svelte";

  $: {
    if (browser) {
      if ($storeUserSettings.themeColor === "dark") {
        window.document.documentElement.classList.add("dark");
      } else {
        window.document.documentElement.classList.remove("dark");
      }
    }
  }

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;

  function onResize(): void {
    storeNoDbCurrentWidth.set(getScreenWidth());
  }

  onNavigate((navigation: OnNavigate) => {
    const documentAsAny: any = document;
    if (!documentAsAny.startViewTransition) return;

    return new Promise((resolve) => {
      documentAsAny.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<svelte:window on:resize={onResize} />
<svelte:head>
  <title>Contract Viewer</title>
</svelte:head>
<div
  class={classNames(
    "flex",
    "flex-row",
    "h-screen w-screen",
    colorDefinitions[themeColor][colorSettings.main].bg,
    colorDefinitions[themeColor][colorSettings.main].text,
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
        "blur-sm pointer-events-none",
    )}
  >
    <Nav />
    <div
      class={classNames(
        "min-h-0 flex-auto",
        "flex flex-col",
        "h-full w-full",
        "px-3 pb-1.5",
        "",
      )}
    >
      <Breadcrumb />
      <slot />
      <BaseSnackbar />
    </div>
  </div>
</div>
