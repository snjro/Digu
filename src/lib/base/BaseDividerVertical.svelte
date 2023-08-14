<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import classNames from "classnames";
  import { buttonHeight, type BaseSize } from "./baseSizes";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";

  export let size: BaseSize;
  export let colorCategory: ColorCategory;
  export let hidden: boolean = false;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<div
  {hidden}
  class={classNames(
    buttonHeight[size],
    "w-0",
    "border-r",
    colorDefinitions[themeColor][colorCategory].border
  )}
/>
