<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { breakPointWidths } from "$lib/appearanceConfig/size/sizeDefinitions";
  import { zIndex } from "$lib/appearanceConfig/zIndex";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import type { ActionReturn } from "svelte/action";
  import Body from "./Body/Body.svelte";
  import Footer from "./Footer/Footer.svelte";
  import Header from "./Header/Header.svelte";

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;

  function clickOutside(node: HTMLDivElement): ActionReturn {
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

<div
  use:clickOutside
  class={classNames(
    "flex-none",
    "flex flex-col",
    "h-full w-[320px]",
    "dark:border-r",
    colorDefinitions[themeColor][colorSettings.leftSidebarBorder].border,
    "shadow-md dark:shadow-none",
    colorDefinitions[themeColor][colorSettings.leftSidebarBorder].shadow,
    !$storeUserSettings.isOpenSidebar && "hidden",
    "cursor-default",
    $storeNoDbCurrentWidth <= breakPointWidths.sm &&
      classNames("absolute top-0", "left-0"),
    zIndex.leftSidebar,
  )}
  on:click_outside={() => {
    if (
      $storeNoDbCurrentWidth <= breakPointWidths.sm &&
      $storeUserSettings.isOpenSidebar
    ) {
      $storeUserSettings.isOpenSidebar = false;
    }
  }}
>
  <Header />
  <Body />
  <Footer />
</div>
