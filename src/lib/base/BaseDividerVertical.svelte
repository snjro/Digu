<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import { buttonHeight, type BaseSize } from "./baseSizes";

  export let size: BaseSize;
  export let colorCategory: ColorCategory;
  export let hidden: boolean = false;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;
</script>

<div
  {hidden}
  class={classNames(
    buttonHeight[size],
    "w-0",
    "border-r",
    colorDefinitions[themeColor][colorCategory].border,
  )}
/>
