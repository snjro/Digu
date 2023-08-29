<script lang="ts">
  import type { ThemeColor } from "@db/dbTypes";
  import classNames from "classnames";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  export let hidden: boolean;
  export let isFullScreen: boolean = false;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (isFullScreen && event.key == "Escape") {
      isFullScreen = false;
    }
  });
</script>

<div
  class={classNames(
    "flex",
    "flex-col",
    "justify-items-center",
    // "items-start",
    isFullScreen
      ? classNames(
          "w-screen",
          "h-screen",
          "absolute",
          "inset-0",
          "pl-1.5",
          "pb-1.5",
          "",
        )
      : "h-full w-full",
    hidden && "hidden",
    colorDefinitions[themeColor][colorSettings.gridContainer].bg,
    "",
  )}
>
  <slot />
</div>
