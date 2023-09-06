<script lang="ts" context="module">
  export const leftSidebarHeaderHeight: string = "h-[84px]";
</script>

<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import ButtonAccordionHandler from "./ButtonAccordionHandler.svelte";
  import ButtonClose from "./ButtonClose.svelte";
  import Logo from "./Logo.svelte";
  import SelectChain from "./SelectChain.svelte";
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;
</script>

<div
  id="leftSidebarHeader"
  class={classNames(
    "sticky",
    "flex-none",
    "flex flex-row",
    "items-center",
    "top-0",
    "w-full",
    leftSidebarHeaderHeight,
    "py-2",
    "px-3",
    "border-b",
    colorDefinitions[themeColor][colorSettings.leftSidebarHeader].border,
    colorDefinitions[themeColor][colorSettings.leftSidebarHeader].bg,
    "",
  )}
>
  <ButtonClose />

  <div
    class={classNames(
      "grid",
      "grid-cols-12",
      "grid-rows-2",
      "place-items-center",
      "gap-2",
    )}
  >
    <div class={classNames("row-span-1", "col-span-10")}>
      <Logo />
    </div>
    <div class={classNames("row-span-1", "col-span-2")} />
    <div class={classNames("row-span-1", "col-span-8")}>
      <SelectChain />
    </div>
    <!-- <div class={classNames("row-span-1", "col-span-1")} /> -->
    <div class={classNames("row-span-1", "col-span-4")}>
      <ButtonAccordionHandler />
    </div>
  </div>
</div>
