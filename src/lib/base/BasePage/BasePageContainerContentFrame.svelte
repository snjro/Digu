<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";

  export let hasTab: boolean = false;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
  let shadowEffect: string;
  $: shadowEffect =
    themeColor === "light" && !hasTab
      ? classNames(
          colorDefinitions[themeColor][colorSettings.tabSelected].shadow,
          "shadow"
        )
      : "";
</script>

<div
  class={classNames(
    "w-full",
    "h-full",
    "p-3",
    "rounded-tr",
    "rounded-b",
    !hasTab && "rounded-tl",
    colorDefinitions[themeColor][colorSettings.tabSelected].bg,
    shadowEffect,
    ""
  )}
>
  <slot />
</div>
