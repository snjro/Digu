<script lang="ts">
  import classNames from "classnames";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import Header from "./Header/Header.svelte";
  import Body from "./Body/Body.svelte";
  import Footer from "./Footer/Footer.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<button
  class={classNames(
    "flex flex-col",
    "absolute top-0",
    "w-full",
    "h-full",
    "sm:w-[320px]",
    "dark:border-r",
    colorDefinitions[themeColor][colorSettings.leftSidebarBorder].border,
    "shadow-md dark:shadow-none",
    colorDefinitions[themeColor][colorSettings.leftSidebarBorder].shadow,
    !$storeUserSettings.isOpenSidebar && "hidden",
    "cursor-default",
    ""
  )}
>
  <Header />
  <Body />
  <Footer />
</button>
