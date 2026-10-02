<script lang="ts">
  import { colorClasses } from "#lib/appearanceConfig/color/colorVariables.js";
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { breakPointWidths } from "#lib/appearanceConfig/size/sizeDefinitions.js";
  import { zIndex } from "#lib/appearanceConfig/zIndex.js";
  import { showSnackBarAsSaveFailed } from "#lib/common/saveFailed.js";
  import { updateDbItemUserSettings } from "#db/dbSettings.js";
  import {
    storeNoDbCurrentWidth,
    storeNoDbSnackBar,
  } from "#stores/storeNoDb.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import { customLogger } from "#utils/logger.js";
  import classNames from "classnames";
  import type { ActionReturn } from "svelte/action";
  import Body from "./Body/Body.svelte";
  import Footer from "./Footer/Footer.svelte";
  import Header from "./Header/Header.svelte";

  function clickOutside(node: HTMLElement): ActionReturn {
    const handleClick = (event: Event) => {
      const target = event.target as HTMLDivElement;
      if (!event.target) {
        return;
      }
      if (node && !node.contains(target) && !event.defaultPrevented) {
        node.dispatchEvent(new CustomEvent("click_outside"));
      }
    };
    document.addEventListener("click", handleClick, true);
    return {
      destroy() {
        document.removeEventListener("click", handleClick, true);
      },
    };
  }
</script>

<aside
  aria-label="Sidebar"
  use:clickOutside
  class={classNames(
    "flex-none",
    "flex flex-col",
    "h-full w-[320px]",
    "dark:border-r",
    colorClasses[colorSettings.leftSidebarBorder].border,
    "shadow-md dark:shadow-none",
    colorClasses[colorSettings.leftSidebarBorder].shadow,
    !$storeUserSettings.isOpenSidebar && "hidden",
    "cursor-default",
    $storeNoDbCurrentWidth <= breakPointWidths.sm &&
      classNames("absolute top-0", "left-0"),
    zIndex.leftSidebar,
  )}
  onclick_outside={async () => {
    if (
      $storeNoDbCurrentWidth <= breakPointWidths.sm &&
      $storeUserSettings.isOpenSidebar
    ) {
      // updateDbItemUserSettings closes it after the save succeeds.
      try {
        await updateDbItemUserSettings("isOpenSidebar", false);
      } catch (error) {
        customLogger.error("Save the sidebar state.", error);
        $storeNoDbSnackBar = showSnackBarAsSaveFailed;
      }
    }
  }}
>
  <Header />
  <Body />
  <Footer />
</aside>
