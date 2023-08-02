<script lang="ts">
  import type { CrumbItem } from "./Breadcrumb.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import BaseA from "$lib/base/BaseA.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import BreadcrumnItemSeparater from "./BreadcrumnItemSeparater.svelte";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  export let targetCrumbItem: CrumbItem;
  export let currentIndex: number;
  export let lastIndex: number;

  const textSize: BaseSize = sizeSettings.breadcrumb;
  const prefixIcon = (
    prefixIconName: CrumbItem["prefixIconName"],
    isLabel: boolean
  ): BaseIconProps | undefined => {
    if (prefixIconName) {
      return {
        name: prefixIconName,
        size: textSize,
        colorCategory: isLabel ? colorSettings.main : "interactive",
      };
    } else {
      return undefined;
    }
  };
</script>

{#if currentIndex === lastIndex}
  <BaseLabel
    text={targetCrumbItem.text}
    {textSize}
    truncate
    prefixIcon={prefixIcon(targetCrumbItem.prefixIconName, true)}
  />
{:else}
  {#if currentIndex === 0 && targetCrumbItem.prefixIconName}
    <BaseButtonIcon
      size={sizeSettings.breadcrumb}
      iconName={targetCrumbItem.prefixIconName}
      tooltipText={targetCrumbItem.text}
      tooltipXPosition="right"
      tooltipYPosition="top"
      colorCategoryBg={colorSettings.main}
      colorCategoryFront={"interactive"}
      href={targetCrumbItem.href}
      shadowEffect={false}
    />
  {:else}
    <BaseA
      text={targetCrumbItem.text}
      {textSize}
      prefixIcon={prefixIcon(targetCrumbItem.prefixIconName, false)}
      href={targetCrumbItem.href}
      openNewTab={false}
      hoverEffect={true}
    />
  {/if}
  <BreadcrumnItemSeparater />
{/if}
