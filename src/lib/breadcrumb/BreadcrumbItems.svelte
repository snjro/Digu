<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseA from "$lib/base/BaseA.svelte";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import type { CrumbItem } from "./crumbs";
  import BreadcrumnItemSeparater from "./BreadcrumnItemSeparater.svelte";
  interface Props {
    targetCrumbItem: CrumbItem;
    currentIndex: number;
    lastIndex: number;
  }

  let { targetCrumbItem, currentIndex, lastIndex }: Props = $props();

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
  // min-w-0 lets the last label shrink and truncate, as it did without the <li>.
  const liClass: string = classNames("flex", "items-center", "min-w-0", "");
</script>

<!-- The item and its separator are separate <li>, so that the <ol> still
  wraps between them. -->
{#if currentIndex === lastIndex}
  {#if targetCrumbItem.text}
    <li class={liClass}>
      <BaseLabel
        text={targetCrumbItem.text}
        textSize={targetSize()}
        truncate
        prefixIcon={prefixIcon(targetCrumbItem.prefixIconName, true)}
      />
    </li>
  {/if}
{:else}
  <li class={liClass}>
    {#if currentIndex === 0 && targetCrumbItem.prefixIconName}
      <BaseButtonIcon
        size={targetSize()}
        iconName={targetCrumbItem.prefixIconName}
        ariaLabel="Home"
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
  </li>
  <li class={liClass} aria-hidden="true">
    <BreadcrumnItemSeparater />
  </li>
{/if}
