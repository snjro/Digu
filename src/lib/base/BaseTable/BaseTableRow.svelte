<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import classNames from "classnames";
  import type { Snippet } from "svelte";

  interface Props {
    hoverEffect?: boolean;
    children?: Snippet;
  }

  let { hoverEffect = true, children }: Props = $props();

  const hoverBgColor = (): `hover:bg-${string}` | undefined => {
    if (hoverEffect) {
      return colorClasses[colorSettings.itemMemberTableBg].bgHover;
    } else {
      return undefined;
    }
  };
</script>

<tr class={classNames(hoverBgColor(), "")}>
  {@render children?.()}
</tr>
