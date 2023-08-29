<script lang="ts">
  import { browser } from "$app/environment";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { breakPointWidths } from "$lib/appearanceConfig/size/sizeDefinitions";
  import BaseSpinner from "$lib/base/BaseSpinner.svelte";
  import LeftSidebar from "$lib/leftSidebar/LeftSidebar.svelte";
  import { toggleLeftSideBar } from "$lib/leftSidebar/functions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getScreenWidth } from "@utils/utilsDom";
  import classNames from "classnames";
  import type { LoadDataRoot } from "./+layout";
  import Content from "./Content.svelte";

  export let data: LoadDataRoot;

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
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  $: bodyStyle = classNames(
    "relative",
    "flex",
    "flex-row",
    "h-screen",
    "w-screen",
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
        $storeNoDbCurrentWidth > breakPointWidths.sm &&
        "leftsidebar-padding",
      "cursor-default"
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

<style lang="scss">
  @use "../lib/leftSidebar/leftsidebar.scss" as lsb;
  .leftsidebar-padding {
    padding-left: lsb.$leftsidebar-width * 1px;
  }
</style>
