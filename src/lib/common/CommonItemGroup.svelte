<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import classNames from "classnames";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import BaseLabel, { type BaseLabelProps } from "$lib/base/BaseLabel.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let text: BaseLabelProps["text"];
  export let gridTrack: string;

  $: shadowStyle = classNames(
    "shadow-sm",
    colorDefinitions[themeColor][colorSettings.itemGroupTitle].shadow
  );

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<div
  class={classNames(
    "flex",
    "flex-col",
    colorDefinitions[themeColor][colorSettings.itemGroupContent].bg,
    "w-full",
    "h-full",
    "rounded",
    "pb-3 ",
    gridTrack,
    themeColor === "light" && shadowStyle,
    // "px-3",
    // "pt-2",
    // "pb-3",
    ""
  )}
>
  <BaseLabel
    {text}
    textSize={sizeSettings.itemGroup}
    appendClass={classNames(
      "px-3",
      "pt-1",
      "pb-1.5",
      "rounded-tl",
      "rounded-br",
      themeColor !== "dark" && "border-b border-r",
      colorDefinitions[themeColor][colorSettings.itemGroupTitle].border
    )}
    colorCategoryBg={colorSettings.itemGroupTitle}
    colorCategoryFront={colorSettings.itemGroupTitle}
  />
  <div
    class={classNames(
      "py-3",
      "px-3",
      "space-y-2.5",
      "w-full",
      "h-full",
      "flex",
      "flex-col"
    )}
  >
    <slot />
  </div>
</div>
