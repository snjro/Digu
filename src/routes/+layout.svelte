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

  export let data: LoadDataRoot;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  $: bodyStyle = classNames(
    "flex",
    "flex-row",
    "h-screen",
    "w-screen",
    $storeNoDbCountShowingDialog > 0 && "blur-sm",
    colorDefinitions[themeColor].primary.bg,
    colorDefinitions[themeColor].primary.text,
    ""
  );
  $: mainContainerStyle = classNames(
    $storeUserSettings.isOpenSidebar &&
      $storeNoDbCurrentWidth < breakPointWidths.sm
      ? "hidden"
      : classNames(
          "flex",
          "flex-col",
          "w-screen",
          "h-screen",
          "overflow-x-auto",
          $storeUserSettings.isOpenSidebar && "pl-[328px]",
          ""
        )
  );
  $: contentStyle = classNames(
    "overflow-y-auto",
    // "overflow-x-hidden",
    "flex-1",
    "flex-col",
    // "self-center",
    "h-full",
    "w-full",
    // "max-w-7xl",
    "border-none",
    "px-3 pb-3 ",
    // $storeUserSettings.isOpenSidebar && "pl-[386px]",
    // "p-5"
    // "p-2"
    // "sm:w-full",
    // "overflow-x-auto",

    colorDefinitions[themeColor][colorSettings.main].bg,
    ""
  );
  function onResize(): void {
    storeNoDbCurrentWidth.set(getScreenWidth());
  }
</script>

<svelte:head>
  <title>monju2</title>
</svelte:head>
<svelte:window on:resize={onResize} />
<body class={bodyStyle}>
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
</body>
