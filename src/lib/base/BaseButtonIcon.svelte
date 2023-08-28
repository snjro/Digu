<script lang="ts" context="module">
  export type SimplifiedButtonDefinition = {
    iconName: BaseIconProps["name"];
    tooltipText: BaseButtonProps["tooltipText"];
    onClickEventFunction: () => void | Promise<void>;
    tooltipXPosition: BaseButtonProps["tooltipXPosition"];
    tooltipYPosition: BaseButtonProps["tooltipYPosition"];
  };
</script>

<script lang="ts">
  import BaseButton, {
    type BaseButtonProps,
  } from "$lib/base/BaseButton.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import { createEventDispatcher } from "svelte";

  export let label: BaseButtonProps["label"] = undefined;
  export let href: BaseButtonProps["href"] = undefined;
  export let openNewTab: BaseButtonProps["openNewTab"] = false;
  export let hoverEffect: BaseButtonProps["hoverEffect"] = true;
  export let shadowEffect: BaseButtonProps["shadowEffect"] = true;
  export let popupEffect: BaseButtonProps["popupEffect"] = true;
  export let noPadding: NonNullable<BaseButtonProps["noPadding"]> = false;
  export let appendClassButton: BaseButtonProps["appendClass"] = undefined;
  export let iconName: BaseIconProps["name"];
  export let prefixIcon: boolean = true;
  export let tooltipText: BaseButtonProps["tooltipText"] = undefined;
  export let tooltipXPosition: BaseButtonProps["tooltipXPosition"] = "right";
  export let tooltipYPosition: BaseButtonProps["tooltipYPosition"] = "top";
  export let size: NonNullable<BaseIconProps["size"]>;
  export let disabled: NonNullable<BaseButtonProps["disabled"]> = false;
  export let colorCategoryFront: ColorCategory | undefined = undefined;
  export let colorCategoryBg: ColorCategory | undefined = undefined;
  export let justify: NonNullable<BaseButtonProps["justify"]> = "center";
  export let isHoverControledByParent: boolean = false;
  export let isHover: boolean = false;
  export let border: boolean = false;
  export let designatedFontWeight: BaseButtonProps["designatedFontWeight"] =
    undefined;
  export let underlineLabel: BaseButtonProps["underlineLabel"] = false;
  export let rounded: BaseButtonProps["rounded"] = false;
  const dispatch = createEventDispatcher();
  function onMouseEnter(event: CustomEvent) {
    if (!isHoverControledByParent) isHover = true;
    dispatch("mouseenter", event.detail);
  }
  function onMouseLeave(event: CustomEvent) {
    if (!isHoverControledByParent) isHover = false;
    dispatch("mouseleave", event.detail);
  }
  let type: NonNullable<BaseButtonProps["type"]> = label ? "normal" : "icon";
</script>

<BaseButton
  {type}
  {href}
  {label}
  {openNewTab}
  {tooltipText}
  {tooltipXPosition}
  {tooltipYPosition}
  {hoverEffect}
  {shadowEffect}
  {popupEffect}
  {colorCategoryBg}
  {colorCategoryFront}
  {noPadding}
  {size}
  {disabled}
  {justify}
  {isHover}
  {border}
  {designatedFontWeight}
  {isHoverControledByParent}
  {underlineLabel}
  {rounded}
  appendClass={appendClassButton}
  on:click
  on:mouseenter={onMouseEnter}
  on:mouseleave={onMouseLeave}
>
  <svelte:fragment slot="prefixIcon">
    {#if prefixIcon}
      <BaseIcon
        name={iconName}
        {size}
        {isHover}
        isHoverControledByParent={true}
        colorCategory={colorCategoryFront}
        cursor="cursor-pointer"
      />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="suffixIcon">
    {#if !prefixIcon}
      <BaseIcon
        name={iconName}
        {size}
        {isHover}
        isHoverControledByParent={true}
        colorCategory={colorCategoryFront}
        cursor="cursor-pointer"
      />
    {/if}
  </svelte:fragment>
</BaseButton>
