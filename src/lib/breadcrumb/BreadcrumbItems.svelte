<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseA from "$lib/base/BaseA.svelte";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import type { CrumbItem } from "./Breadcrumb.svelte";
  import BreadcrumnItemSeparater from "./BreadcrumnItemSeparater.svelte";
  export let targetCrumbItem: CrumbItem;
  export let currentIndex: number;
  export let lastIndex: number;

  const targetSize = (): BaseSize => {
    return currentIndex === 0
      ? changeSize(sizeSettings.breadcrumb, 1)
      : sizeSettings.breadcrumb;
  };
  const prefixIcon = (
    prefixIconName: CrumbItem["prefixIconName"],
    isLabel: boolean,
  ): BaseIconProps | undefined => {
    if (prefixIconName) {
      return {
        name: prefixIconName,
        size: targetSize(),
        colorCategory: isLabel ? colorSettings.main : "interactive",
      };
    } else {
      return undefined;
    }
  };
</script>

{#if currentIndex === lastIndex}
  {#if targetCrumbItem.text}
    <BaseLabel
      text={targetCrumbItem.text}
      textSize={targetSize()}
      truncate
      prefixIcon={prefixIcon(targetCrumbItem.prefixIconName, true)}
    />
  {/if}
{:else}
  {#if currentIndex === 0 && targetCrumbItem.prefixIconName}
    <BaseButtonIcon
      size={targetSize()}
      iconName={targetCrumbItem.prefixIconName}
      colorCategoryBg={colorSettings.main}
      colorCategoryFront={"interactive"}
      href={targetCrumbItem.href}
      shadowEffect={false}
      hoverEffect={false}
    />
  {:else}
    <BaseA
      text={targetCrumbItem.text}
      textSize={targetSize()}
      prefixIcon={prefixIcon(targetCrumbItem.prefixIconName, false)}
      href={targetCrumbItem.href}
      openNewTab={false}
      hoverEffect={true}
    />
  {/if}
  <BreadcrumnItemSeparater />
{/if}
