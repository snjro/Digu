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
    gridTrack,
    ""
  )}
>
  <BaseLabel
    {text}
    textSize={sizeSettings.itemGroup}
    appendClass={classNames(
      "pl-1.5",
      "pr-3",
      "py-1.5",
      "rounded-tl",
      "rounded-br"
    )}
    colorCategoryBg={colorSettings.itemGroupTitle}
    colorCategoryFront={colorSettings.itemGroupTitle}
  />
  <div
    class={classNames(
      "py-3",
      "px-3",
      "space-y-3",
      "w-full",
      "h-full",
      "flex",
      "flex-col"
    )}
  >
    <slot />
  </div>
</div>
