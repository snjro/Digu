<!-- TODO: delete this file. -->
<script lang="ts">
  import classNames from "classnames";
  import { colorDefinitions, type ColorCategory } from "./colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import ColorTestItemIcon from "./colorTestItemIcon.svelte";

  export let themeColor: ThemeColor;
  export let colorCategory: ColorCategory;
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "items-center",
    colorDefinitions[themeColor][colorCategory].bg,
    colorDefinitions[themeColor][colorCategory].bgHover,
    "border",
    colorDefinitions[themeColor][colorCategory].border,
    "shadow",
    colorDefinitions[themeColor][colorCategory].shadow
  )}
>
  <ColorTestItemIcon {colorCategory} {themeColor} />
  <p
    class={classNames(
      colorDefinitions[themeColor][colorCategory].text,
      colorDefinitions[themeColor][colorCategory].textHover
    )}
  >
    hover
  </p>
</div>
<div
  class={classNames(
    "flex",
    "flex-row",
    "items-center",
    colorDefinitions[themeColor][colorCategory].bgEmphasis,
    "border",
    colorDefinitions[themeColor][colorCategory].border,
    "shadow",
    colorDefinitions[themeColor][colorCategory].shadow
  )}
>
  <ColorTestItemIcon {colorCategory} {themeColor} fillType="emphasis" />
  <p
    class={classNames(colorDefinitions[themeColor][colorCategory].textEmphasis)}
  >
    emphasis
  </p>
</div>
<div
  class={classNames(
    "flex",
    "flex-row",
    "items-center",
    colorDefinitions[themeColor][colorCategory].bgOpacity,
    "border",
    colorDefinitions[themeColor][colorCategory].border,
    "shadow",
    colorDefinitions[themeColor][colorCategory].shadow
  )}
>
  <ColorTestItemIcon {colorCategory} {themeColor} fillType="opacity" />
  <p
    class={classNames(colorDefinitions[themeColor][colorCategory].textOpacity)}
  >
    opacity
  </p>
</div>
