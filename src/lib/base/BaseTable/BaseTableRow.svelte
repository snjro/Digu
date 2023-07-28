<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import classNames from "classnames";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let hoverEffect: boolean = true;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  $: hoverBgColor = (): `hover:bg-${string}` | undefined => {
    if (hoverEffect) {
      return colorDefinitions[themeColor][colorSettings.itemMemberTableBg]
        .bgHover;
    } else {
      return undefined;
    }
  };
</script>

<tr class={classNames(hoverBgColor(), "")}>
  <slot />
</tr>
