<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import classNames from "classnames";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";

  export let colorCategory: ColorCategory;
  export let hidden: boolean = false;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<div
  {hidden}
  class={classNames(
    "h-[1px]",
    "w-full",
    "border-t",
    colorDefinitions[themeColor][colorCategory].border
  )}
/>
