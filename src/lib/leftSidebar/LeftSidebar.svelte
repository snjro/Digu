<script lang="ts">
  import classNames from "classnames";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import Header from "./Header/Header.svelte";
  import Body from "./Body/Body.svelte";
  import Footer from "./Footer/Footer.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { breakPointWidths } from "$lib/appearanceConfig/size/sizeDefinitions";
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<div
  class={classNames(
    "flex flex-col",
    "fixed top-0",
    "h-full",
    "leftsidebar-width",
    "dark:border-r",
    colorDefinitions[themeColor][colorSettings.leftSidebarBorder].border,
    "shadow-md dark:shadow-none",
    colorDefinitions[themeColor][colorSettings.leftSidebarBorder].shadow,
    !$storeUserSettings.isOpenSidebar && "hidden",
    "cursor-default",
    $storeNoDbCurrentWidth <= breakPointWidths.sm && "z-10",
    ""
  )}
>
  <Header />
  <Body />
  <Footer />
</div>

<style lang="scss">
  @use "./leftsidebar.scss" as lsb;
  .leftsidebar-width {
    width: lsb.$leftsidebar-width * 1px;
  }
</style>
