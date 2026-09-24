<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import type { Snippet } from "svelte";

  interface Props {
    hoverEffect?: boolean;
    children?: Snippet;
  }

  let { hoverEffect = true, children }: Props = $props();

  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  const hoverBgColor = (): `hover:bg-${string}` | undefined => {
    if (hoverEffect) {
      return colorDefinitions[themeColor][colorSettings.itemMemberTableBg]
        .bgHover;
    } else {
      return undefined;
    }
  };
</script>

<tr class={classNames(hoverBgColor(), "")}>
  {@render children?.()}
</tr>
