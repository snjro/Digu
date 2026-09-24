<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel, { type BaseLabelProps } from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import type { Snippet } from "svelte";

  interface Props {
    text?: BaseLabelProps["text"] | undefined;
    children?: Snippet;
  }

  let { text = undefined, children }: Props = $props();

  const textSize: BaseSize = sizeSettings.itemTitle;
</script>

<div
  class={classNames("w-full", "h-fit", "flex", "flex-col", "justify-start", "")}
>
  {#if text}
    <BaseLabel
      {text}
      {textSize}
      colorCategoryFront={colorSettings.itemMemberTitle}
      colorCategoryBg={colorSettings.itemMemberTitle}
      appendClass={classNames("pl-1", "pr-1.5", "pb-[1px]", "rounded-xs")}
    />
  {/if}
  <div class={classNames("pl-1", "pr-3", "w-full h-fit")}>
    {@render children?.()}
  </div>
</div>
