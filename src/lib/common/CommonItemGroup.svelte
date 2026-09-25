<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel, { type BaseLabelProps } from "$lib/base/BaseLabel.svelte";
  import classNames from "classnames";
  import type { Snippet } from "svelte";

  interface Props {
    text?: BaseLabelProps["text"];
    gridTrack: string;
    children?: Snippet;
  }

  let { text = undefined, gridTrack, children }: Props = $props();
</script>

<div
  class={classNames(
    "flex",
    "flex-col",
    colorClasses[colorSettings.itemGroupContent].bg,
    "w-full",
    "h-full",
    "rounded-sm",
    gridTrack,
    "",
  )}
>
  {#if text}
    <BaseLabel
      {text}
      textSize={sizeSettings.itemGroup}
      appendClass={classNames(
        "pl-1.5",
        "pr-3",
        "pb-0.5",
        "rounded-tl-sm",
        "rounded-br-sm",
      )}
      colorCategoryBg={colorSettings.itemGroupTitle}
      colorCategoryFront={colorSettings.itemGroupTitle}
    />
  {/if}
  <div
    class={classNames(
      "py-3",
      "px-3",
      "space-y-3",
      "w-full",
      "h-full",
      "flex",
      "flex-col",
    )}
  >
    {@render children?.()}
  </div>
</div>
