<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import classNames from "classnames";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";

  export let colorCategoryBgHover: ColorCategory | undefined = undefined;
  export let hoverEffect: boolean = true;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  $: hoverBgColor = (): `hover:bg-${string}` | "" => {
    if (hoverEffect) {
      if (colorCategoryBgHover) {
        return colorDefinitions[themeColor][colorCategoryBgHover].bgHover;
      } else {
        return "hover:bg-inherit";
      }
    } else {
      return "";
    }
  };
</script>

<tr class={classNames(hoverBgColor(), "")}>
  <slot />
</tr>
