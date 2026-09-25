<script lang="ts" module>
  export type BaseButtonProps = {
    type: "icon" | "normal";
    label?: string;
    pill?: boolean;
    size?: BaseSize;
    href?: string;
    openNewTab?: boolean;
    border?: boolean;
    forcedClass?: string;
    appendClass?: string;
    justify: keyof typeof justifyPositions;
    disabled?: boolean;
    tooltipText?: BaseTooltipProps["text"];
    ariaLabel?: string;
    tooltipXPosition?: BaseTooltipProps["xPosition"];
    tooltipYPosition?: BaseTooltipProps["yPosition"];
    colorCategoryFront?: ColorCategory;
    colorCategoryBg?: ColorCategory;
    noPadding?: boolean;
    hoverEffect?: boolean;
    shadowEffect?: boolean;
    popupEffect?: boolean;
    opacityEffect?: boolean;
    designatedFontWeight?: BaseLabelProps["fontWeight"];
    underlineLabel: boolean;
    rounded: boolean;
  };
  const justifyPositions = {
    start: "justify-start",
    center: "justify-center",
    between: "justify-between",
    end: "justify-end",
    around: "justify-around",
    evenly: "justify-evenly",
  };
  const paddingSizes: {
    [key in BaseButtonProps["type"]]: { [key in BaseSize]: string };
  } = {
    normal: {
      xs: "px-1 py-1 space-x-1",
      sm: "px-3 py-1 space-x-3",
      md: "px-3 py-1.5 space-x-3",
      lg: "px-5 py-1.5 space-x-5",
      xl: "px-5 py-2 space-x-5",
      "2xl": "px-6 py-2 space-x-6",
      "3xl": "px-7 py-2.5 space-x-7",
      "4xl": "px-8 py-2.5 space-x-8",
      "5xl": "px-9 py-3 space-x-9",
    },
    icon: {
      xs: "p-[1px]",
      sm: "p-0.5",
      md: "p-0.5",
      lg: "p-0.5",
      xl: "p-0.5",
      "2xl": "p-0.5",
      "3xl": "p-0.5",
      "4xl": "p-0.5",
      "5xl": "p-0.5",
    },
  };
</script>

<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { twMerge } from "tailwind-merge";

  import { type ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { Snippet } from "svelte";
  import classNames from "classnames";
  import { setPropsByOpenNewTab } from "./BaseA.svelte";
  import BaseButtonContent from "./BaseButtonContent.svelte";
  import type { BaseLabelProps } from "./BaseLabel.svelte";
  import BaseTooltip, { type BaseTooltipProps } from "./BaseTooltip.svelte";
  import type { BaseSize } from "./baseSizes";
  import { baseShadowSizes, baseTextHeight, baseTextSizes } from "./baseSizes";

  interface Props {
    type?: NonNullable<BaseButtonProps["type"]>;
    label?: BaseButtonProps["label"];
    size?: NonNullable<BaseButtonProps["size"]>;
    href?: BaseButtonProps["href"];
    openNewTab?: NonNullable<BaseButtonProps["openNewTab"]>;
    border?: NonNullable<BaseButtonProps["border"]>;
    forcedClass?: BaseButtonProps["forcedClass"];
    appendClass?: BaseButtonProps["appendClass"];
    disabled?: NonNullable<BaseButtonProps["disabled"]>;
    noPadding?: NonNullable<BaseButtonProps["noPadding"]>;
    hoverEffect?: NonNullable<BaseButtonProps["hoverEffect"]>;
    shadowEffect?: NonNullable<BaseButtonProps["shadowEffect"]>;
    popupEffect?: NonNullable<BaseButtonProps["popupEffect"]>;
    justify?: NonNullable<BaseButtonProps["justify"]>;
    tooltipText?: BaseButtonProps["tooltipText"];
    ariaLabel?: BaseButtonProps["ariaLabel"];
    tooltipXPosition?: BaseButtonProps["tooltipXPosition"];
    tooltipYPosition?: BaseButtonProps["tooltipYPosition"];
    colorCategoryFront?: BaseButtonProps["colorCategoryFront"];
    colorCategoryBg?: BaseButtonProps["colorCategoryBg"];
    isHover?: boolean;
    isHoverControledByParent?: boolean;
    underlineLabel?: BaseButtonProps["underlineLabel"];
    designatedFontWeight?: BaseButtonProps["designatedFontWeight"];
    rounded?: BaseButtonProps["rounded"];
    onclick?: ((event: MouseEvent) => void) | undefined;
    onmouseenter?: ((event: MouseEvent) => void) | undefined;
    onmouseleave?: ((event: MouseEvent) => void) | undefined;
    prefixIcon?: Snippet;
    suffixIcon?: Snippet;
  }

  let {
    type = "normal",
    label = undefined,
    size = "md",
    href = undefined,
    openNewTab = false,
    border = false,
    forcedClass = undefined,
    appendClass = undefined,
    disabled = false,
    noPadding = false,
    hoverEffect = true,
    shadowEffect = true,
    popupEffect = true,
    justify = "center",
    tooltipText = undefined,
    ariaLabel = undefined,
    tooltipXPosition = "right",
    tooltipYPosition = "top",
    colorCategoryFront = undefined,
    colorCategoryBg = undefined,
    isHover = false,
    isHoverControledByParent = false,
    underlineLabel = false,
    designatedFontWeight = undefined,
    rounded = true,
    onclick = undefined,
    onmouseenter = undefined,
    onmouseleave = undefined,
    prefixIcon,
    suffixIcon,
  }: Props = $props();

  function onMouseEnter(event: MouseEvent) {
    if (!isHoverControledByParent) isHover = true;
    onmouseenter?.(event);
  }
  function onMouseLeave(event: MouseEvent) {
    if (!isHoverControledByParent) isHover = false;
    onmouseleave?.(event);
  }
  // A button with a visible label keeps its text as its name.
  const accessibleName: string | undefined = $derived(
    label ? undefined : (ariaLabel ?? tooltipText),
  );
  const textColor = (): string => {
    let textColor: string;
    if (hoverEffect && isHover) {
      if (colorCategoryFront) {
        textColor = colorClasses[colorCategoryFront].textEmphasis;
      } else {
        textColor = "text-inherit";
      }
    } else {
      if (colorCategoryFront) {
        textColor = colorClasses[colorCategoryFront].text;
      } else {
        textColor = "text-inherit";
      }
    }
    return textColor;
  };
  const bgColor = () => {
    let bgColor: string;
    if (hoverEffect && isHover) {
      if (colorCategoryBg) {
        bgColor = colorClasses[colorCategoryBg].bgEmphasis;
      } else {
        bgColor = "bg-inherit";
      }
    } else {
      if (colorCategoryBg) {
        bgColor = colorClasses[colorCategoryBg].bg;
      } else {
        bgColor = "bg-inherit";
      }
    }
    return bgColor;
  };
  const borderColor = (): string => {
    let borderColor: string = "";
    if (border) {
      if (colorCategoryFront) {
        borderColor = colorClasses[colorCategoryFront].border;
      } else {
        borderColor = "border-inherit";
      }
      borderColor = classNames("border", borderColor);
    }

    return borderColor;
  };
  const shadowColor = (): string => {
    if (shadowEffect) {
      return colorCategoryBg
        ? colorClasses[colorCategoryBg].shadow
        : "shadow-inherit";
    }
    return "shadow-inherit";
  };
  const padding = (): string => {
    let padding: string;
    if (noPadding) {
      padding = "p-0";
    } else {
      padding = paddingSizes[type][size];
    }
    return padding;
  };
  let customClass: string = $derived(
    forcedClass ??
      twMerge(
        // "lg:text-center",
        "inline-flex",
        "items-center",
        "disabled:cursor-not-allowed",
        "disabled:opacity-50",
        label ? "w-fit" : baseTextHeight[size].replace("h-", "w-"),
        baseTextHeight[size],
        "cursor-pointer",
        justifyPositions[justify],
        bgColor(),
        textColor(),
        borderColor(),
        type === "normal" && baseTextSizes[size],
        padding(),
        rounded && "rounded-sm",
        // "relative",
        shadowEffect && "flex items-center",
        shadowEffect && baseShadowSizes[size],
        "dark:shadow-none",
        !disabled && "active:shadow-none",
        shadowColor(),
        shadowEffect && "active:border-none",
        // !shadowEffect && "top-[2px]",
        label && "truncate",
        popupEffect && "active:translate-y-px",
        appendClass,
      ),
  );
</script>

<BaseTooltip
  text={tooltipText}
  xPosition={tooltipXPosition}
  yPosition={tooltipYPosition}
>
  {#if href}
    <a
      {href}
      class={customClass}
      aria-label={accessibleName}
      {...setPropsByOpenNewTab(openNewTab)}
      {onclick}
      onmouseenter={onMouseEnter}
      onmouseleave={onMouseLeave}
    >
      <BaseButtonContent
        {label}
        {size}
        {underlineLabel}
        {designatedFontWeight}
        {prefixIcon}
        {suffixIcon}
      />
    </a>
  {:else}
    <button
      class={customClass}
      {disabled}
      aria-label={accessibleName}
      {onclick}
      onmouseenter={onMouseEnter}
      onmouseleave={onMouseLeave}
    >
      <BaseButtonContent
        {label}
        {size}
        {underlineLabel}
        {designatedFontWeight}
        {prefixIcon}
        {suffixIcon}
      />
    </button>
  {/if}
</BaseTooltip>
