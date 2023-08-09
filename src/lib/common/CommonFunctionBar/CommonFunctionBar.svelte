<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  import BasePageContainerTitle from "$lib/base/BasePage/BasePageContainerTitle.svelte";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";

  export let isFullScreen: boolean;
  export let titleText: string;
  export let titleCategoryLabelTextForFullScreen: string;
  export let justifyAlignment:
    | "justify-between"
    | "justify-start"
    | "justify-end" = "justify-between";

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "h-fit w-full",
    "items-center",
    justifyAlignment,
    "space-x-5",
    colorDefinitions[themeColor][colorSettings.gridHeader].bg,
    isFullScreen ? "px-3" : "px-0.5",
    isFullScreen ? "py-3" : "pb-3"
  )}
>
  {#if isFullScreen}
    <BasePageContainerTitle
      {titleText}
      titleCategoryLabelText={titleCategoryLabelTextForFullScreen}
    />
  {/if}
  <slot />
</div>
