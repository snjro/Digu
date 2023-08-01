<script lang="ts">
  import LeftSidebar from "$lib/leftSidebar/LeftSidebar.svelte";
  import classNames from "classnames";
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
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { scrollbarStyle } from "$lib/appearanceConfig/scrollbar/scrollbarSetting";
  import { toggleLeftSideBar } from "$lib/leftSidebar/functions";
  import Content from "./Content.svelte";

  export let data: LoadDataRoot;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  $: bodyStyle = classNames(
    "relative",
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
    classNames(
      "flex",
      "flex-col",
      "w-screen",
      "h-screen",
      $storeUserSettings.isOpenSidebar &&
        ($storeNoDbCurrentWidth <= breakPointWidths.sm
          ? "" //"blur-sm"
          : "pl-[320px]"),
      "overflow-x-auto",
      "overflow-y-auto",
      scrollbarStyle(colorSettings.main).thick,
      "cursor-default",
      ""
    )
  );
  $: showFilter =
    $storeUserSettings.isOpenSidebar &&
    $storeNoDbCurrentWidth <= breakPointWidths.sm;
  const clickFilter = async (): Promise<void> => {
    if (showFilter) {
      await toggleLeftSideBar();
    }
  };
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
      <button
        on:click={clickFilter}
        class={classNames(
          "absolute",
          "h-full",
          "w-full",
          !showFilter && "hidden",
          colorDefinitions[themeColor][colorSettings.leftSidebarHeader].bg,
          "opacity-60",
          "blur-sm",
          "cursor-default"
        )}
      />
      <Content><slot /></Content>
    </div>
  {/if}
</div>
