<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";

  export let hasTab: boolean = false;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<div class={classNames("flex-auto", "min-h-0")}>
  <div
    class={classNames(
      "h-full",
      "w-full",
      "py-1.5",
      "pl-1.5",
      "rounded-tr",
      "rounded-b",
      !hasTab && "rounded-tl",
      colorDefinitions[themeColor][colorSettings.tabSelected].bg,
      ""
    )}
  >
    <slot />
  </div>
</div>
