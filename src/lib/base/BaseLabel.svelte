<script lang="ts" module>
  export type BaseLabelProps = {
    text: string | undefined;
    inputId?: string;
    textSize?: BaseSize;
    forcedClass?: string;
    appendClass?: string;
    disabled?: boolean;
    prefixIcon?: BaseIconProps;
    suffixIcon?: BaseIconProps;
    colorCategoryFront?: ColorCategory;
    colorCategoryBg?: ColorCategory;
    fontWeight?:
      | "font-thin"
      | "font-extralight"
      | "font-light"
      | "font-normal"
      | "font-medium"
      | "font-semibold"
      | "font-bold"
      | "font-extrabold"
      | "font-black";
  };
</script>

<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { type ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import CommonCopyButton from "$lib/common/CommonCopyButton.svelte";
  import { NO_DATA } from "@utils/utilsConstants";
  import classNames from "classnames";
  import { twMerge } from "tailwind-merge";
  import type { Snippet } from "svelte";
  import type { BaseIconProps } from "./BaseIcon";
  import BaseIcon from "./BaseIcon.svelte";
  import type { BaseSize } from "./baseSizes";
  import { baseTextSizes, changeSize } from "./baseSizes";
  interface Props {
    text: BaseLabelProps["text"];
    inputId?: BaseLabelProps["inputId"];
    colorCategoryFront?: BaseLabelProps["colorCategoryFront"];
    colorCategoryBg?: BaseLabelProps["colorCategoryBg"];
    textSize?: NonNullable<BaseLabelProps["textSize"]>;
    forcedClass?: BaseLabelProps["forcedClass"];
    appendClass?: BaseLabelProps["appendClass"];
    disabled?: NonNullable<BaseLabelProps["disabled"]>;
    prefixIcon?: BaseLabelProps["prefixIcon"];
    suffixIcon?: BaseLabelProps["suffixIcon"];
    cursorPointer?: boolean;
    fontMono?: boolean;
    italic?: boolean;
    truncate?: boolean;
    showCopyButton?: boolean;
    fontWeight?: BaseLabelProps["fontWeight"];
    children?: Snippet;
  }

  let {
    text,
    inputId = undefined,
    colorCategoryFront = undefined,
    colorCategoryBg = undefined,
    textSize = "md",
    forcedClass = undefined,
    appendClass = undefined,
    disabled = false,
    prefixIcon = undefined,
    suffixIcon = undefined,
    cursorPointer = false,
    fontMono = false,
    italic = false,
    truncate = true,
    showCopyButton = false,
    fontWeight = "font-normal",
    children,
  }: Props = $props();

  // Returns a new object instead of changing the one in the props.
  const withDefaults = (
    iconProps: BaseIconProps | undefined,
  ): BaseIconProps | undefined =>
    iconProps && {
      ...iconProps,
      size: iconProps.size || textSize,
      colorCategory: iconProps.colorCategory || colorCategoryFront,
    };
  let prefixIconProps = $derived(withDefaults(prefixIcon));
  let suffixIconProps = $derived(withDefaults(suffixIcon));

  let customClass = $derived(
    forcedClass ??
      twMerge(
        baseTextSizes[textSize],
        "w-fit",
        colorCategoryFront
          ? colorClasses[colorCategoryFront].text
          : "text-inherit",
        colorCategoryBg ? colorClasses[colorCategoryBg].bg : "bg-transparent",
        // A label has no :disabled, so the class is set directly.
        disabled && "opacity-75",
        truncate && "truncate",
        cursorPointer ? "cursor-pointer" : "cursor-text",
        fontMono && "font-mono",
        italic && "italic",
        fontWeight,
        appendClass,
      ),
  );
</script>

<div
  class={classNames(
    "flex",
    "items-center",
    "space-x-1",
    "w-fit",
    "max-w-full",
    "h-fit",
    "",
  )}
>
  {#if prefixIconProps}
    <BaseIcon {...prefixIconProps} />
  {/if}
  <label for={inputId} class={customClass}>
    {text ? text : NO_DATA}{@render children?.()}
  </label>
  {#if suffixIconProps}
    <BaseIcon {...suffixIconProps} />
  {/if}
  {#if showCopyButton}
    <CommonCopyButton
      copyTarget={text ? text : NO_DATA}
      size={changeSize(textSize, -1)}
      colorCategory={colorCategoryFront}
    />
  {/if}
</div>
