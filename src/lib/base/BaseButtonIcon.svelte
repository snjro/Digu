<script lang="ts" module>
  export type SimplifiedButtonDefinition = {
    iconName: BaseIconProps["name"];
    tooltipText: BaseButtonProps["tooltipText"];
    onClickEventFunction: () => void | Promise<void>;
    tooltipXPosition: BaseButtonProps["tooltipXPosition"];
    tooltipYPosition: BaseButtonProps["tooltipYPosition"];
  };
</script>

<script lang="ts">
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import BaseButton, {
    type BaseButtonProps,
  } from "$lib/base/BaseButton.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseIcon from "$lib/base/BaseIcon.svelte";

  interface Props {
    label?: BaseButtonProps["label"];
    href?: BaseButtonProps["href"];
    openNewTab?: BaseButtonProps["openNewTab"];
    hoverEffect?: BaseButtonProps["hoverEffect"];
    shadowEffect?: BaseButtonProps["shadowEffect"];
    popupEffect?: BaseButtonProps["popupEffect"];
    noPadding?: NonNullable<BaseButtonProps["noPadding"]>;
    appendClassButton?: BaseButtonProps["appendClass"];
    iconName: BaseIconProps["name"];
    isPrefixIcon?: boolean;
    tooltipText?: BaseButtonProps["tooltipText"];
    ariaLabel?: BaseButtonProps["ariaLabel"];
    tooltipXPosition?: BaseButtonProps["tooltipXPosition"];
    tooltipYPosition?: BaseButtonProps["tooltipYPosition"];
    size: NonNullable<BaseIconProps["size"]>;
    disabled?: NonNullable<BaseButtonProps["disabled"]>;
    colorCategoryFront?: ColorCategory | undefined;
    colorCategoryBg?: ColorCategory | undefined;
    justify?: NonNullable<BaseButtonProps["justify"]>;
    isHoverControledByParent?: boolean;
    isHover?: boolean;
    border?: boolean;
    designatedFontWeight?: BaseButtonProps["designatedFontWeight"];
    underlineLabel?: BaseButtonProps["underlineLabel"];
    rounded?: BaseButtonProps["rounded"];
    onclick?: ((event: MouseEvent) => void) | undefined;
    onmouseenter?: ((event: MouseEvent) => void) | undefined;
    onmouseleave?: ((event: MouseEvent) => void) | undefined;
  }

  let {
    label = undefined,
    href = undefined,
    openNewTab = false,
    hoverEffect = true,
    shadowEffect = true,
    popupEffect = true,
    noPadding = false,
    appendClassButton = undefined,
    iconName,
    isPrefixIcon = true,
    tooltipText = undefined,
    ariaLabel = undefined,
    tooltipXPosition = "right",
    tooltipYPosition = "top",
    size,
    disabled = false,
    colorCategoryFront = undefined,
    colorCategoryBg = undefined,
    justify = "center",
    isHoverControledByParent = false,
    isHover = false,
    border = false,
    designatedFontWeight = undefined,
    underlineLabel = false,
    rounded = true,
    onclick = undefined,
    onmouseenter = undefined,
    onmouseleave = undefined,
  }: Props = $props();
  function onMouseEnter(event: MouseEvent) {
    if (!isHoverControledByParent) isHover = true;
    onmouseenter?.(event);
  }
  function onMouseLeave(event: MouseEvent) {
    if (!isHoverControledByParent) isHover = false;
    onmouseleave?.(event);
  }
  const type: NonNullable<BaseButtonProps["type"]> = $derived(
    label ? "normal" : "icon",
  );
</script>

<BaseButton
  {type}
  {href}
  {label}
  {openNewTab}
  {tooltipText}
  {ariaLabel}
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
  {onclick}
  onmouseenter={onMouseEnter}
  onmouseleave={onMouseLeave}
>
  {#snippet prefixIcon()}
    {#if isPrefixIcon}
      <BaseIcon
        name={iconName}
        {size}
        {isHover}
        isHoverControledByParent={true}
        colorCategory={colorCategoryFront}
        cursor="cursor-pointer"
      />
    {/if}
  {/snippet}
  {#snippet suffixIcon()}
    {#if !isPrefixIcon}
      <BaseIcon
        name={iconName}
        {size}
        {isHover}
        isHoverControledByParent={true}
        colorCategory={colorCategoryFront}
        cursor="cursor-pointer"
      />
    {/if}
  {/snippet}
</BaseButton>
