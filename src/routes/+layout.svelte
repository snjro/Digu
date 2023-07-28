<script lang="ts">
  // import "../app.postcss";
  // import "./global.css";

  import Nav from "$lib/nav/Nav.svelte";
  import LeftSidebar from "$lib/leftSidebar/LeftSidebar.svelte";
  import classNames from "classnames";
  import Breadcrumb from "$lib/breadcrumb/Breadcrumb.svelte";
  import BaseSpinner from "$lib/base/BaseSpinner.svelte";
  import type { LoadDataRoot } from "./+layout";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import {
    storeNoDbCurrentWidth,
    storeNoDbCountShowingDialog,
  } from "@stores/storeNoDb";
  import { breakPointWidths, getScreenWidth } from "@utils/utilsDom";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import BaseSnackbar from "$lib/base/BaseSnackbar.svelte";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { scrollbarStyle } from "$lib/appearanceConfig/scrollbar/scrollbarSetting";

  export let data: LoadDataRoot;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  $: bodyStyle = classNames(
    "flex",
    "flex-row",
    "h-screen",
    "w-screen",
    $storeNoDbCountShowingDialog > 0 && "blur-sm",
    colorDefinitions[themeColor][colorSettings.main].bg,
    colorDefinitions[themeColor][colorSettings.main].text,
    ""
  );
  $: mainContainerStyle = classNames(
    $storeUserSettings.isOpenSidebar &&
      $storeNoDbCurrentWidth <= breakPointWidths.sm
      ? "hidden"
      : classNames(
          "flex",
          "flex-col",
          "w-screen",
          "h-screen",
          $storeUserSettings.isOpenSidebar && "pl-[320px]",
          "overflow-x-auto",
          "overflow-y-auto",
          scrollbarStyle(colorSettings.main).thick,
          ""
        )
  );
  $: contentStyle = classNames(
    "overflow-y-auto",
    scrollbarStyle(colorSettings.main).thick,
    "flex-1",
    "flex-col",
    "h-full",
    "w-full",
    "border-none",
    "px-3 pb-3 ",
    colorDefinitions[themeColor][colorSettings.main].bg,
    ""
  );
  function onResize(): void {
    storeNoDbCurrentWidth.set(getScreenWidth());
  }
</script>

<svelte:window on:resize={onResize} />
<svelte:head>
  <title>Contract Viewer</title>
</svelte:head>
<div class={bodyStyle}>
  {#if data.initializing}
    <BaseSpinner size="3xl" />
  {:else}
    <LeftSidebar />
    <div class={mainContainerStyle}>
      <Nav />
      <div class={contentStyle}>
        <Breadcrumb />
        <slot />
        <BaseSnackbar />
      </div>
    </div>
  {/if}
</div>
