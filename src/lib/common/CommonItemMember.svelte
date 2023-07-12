<script lang="ts">
  import classNames from "classnames";
  import BaseLabel, { type BaseLabelProps } from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let text: BaseLabelProps["text"] | undefined = undefined;

  const textSize: BaseSize = sizeSettings.itemTitle;
</script>

<div
  class={classNames("w-full", "h-fit", "flex", "flex-col", "justify-start", "")}
>
  {#if text}
    <BaseLabel
      {text}
      {textSize}
      fontWeight="font-medium"
      colorCategoryFront={colorSettings.itemMemberText}
      prefixIcon={{
        name: "circleSmall",
        size: textSize,
        colorCategory: colorSettings.itemMemberText,
      }}
    />
  {/if}
  <div class={classNames("pl-7", "pr-3", "w-full h-fit")}>
    <slot />
  </div>
</div>
