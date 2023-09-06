<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";

  export let colorCategory: ColorCategory;
  export let hidden: boolean = false;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;
</script>

<div
  {hidden}
  class={classNames(
    "h-[1px]",
    "w-full",
    "border-t",
    colorDefinitions[themeColor][colorCategory].border,
  )}
/>
