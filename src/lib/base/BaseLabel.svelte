<script lang="ts" context="module">
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
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import CommonCopyButton from "$lib/common/CommonCopyButton.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { NO_DATA } from "@utils/utilsCostants";
  import classNames from "classnames";
  import { twMerge } from "tailwind-merge";
  import type { BaseIconProps } from "./BaseIcon";
  import BaseIcon from "./BaseIcon.svelte";
  import type { BaseSize } from "./baseSizes";
  import { baseTextSizes, changeSize } from "./baseSizes";
  export let text: BaseLabelProps["text"];
  export let inputId: BaseLabelProps["inputId"] = undefined;
  export let colorCategoryFront: BaseLabelProps["colorCategoryFront"] =
    undefined;
  export let colorCategoryBg: BaseLabelProps["colorCategoryBg"] = undefined;
  export let textSize: NonNullable<BaseLabelProps["textSize"]> = "md";
  export let forcedClass: BaseLabelProps["forcedClass"] = undefined;
  export let appendClass: BaseLabelProps["appendClass"] = undefined;
  export let disabled: NonNullable<BaseLabelProps["disabled"]> = false;
  export let prefixIcon: BaseLabelProps["prefixIcon"] = undefined;
  export let suffixIcon: BaseLabelProps["suffixIcon"] = undefined;
  export let cursorPointer: boolean = false;
  export let fontMono: boolean = false;
  export let italic: boolean = false;
  export let truncate: boolean = true;
  export let showCopyButton: boolean = false;
  export let fontWeight: BaseLabelProps["fontWeight"] = "font-normal";

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  function setIconProps(iconProps: BaseIconProps | undefined): void {
    if (iconProps) {
      if (!iconProps.size) {
        iconProps.size = textSize;
      }
      if (!iconProps.colorCategory) {
        iconProps.colorCategory = colorCategoryFront;
      }
    }
  }
  $: setIconProps(prefixIcon);
  $: setIconProps(suffixIcon);

  $: customClass =
    forcedClass ??
    twMerge(
      baseTextSizes[textSize],
      "w-fit",
      colorCategoryFront
        ? colorDefinitions[themeColor][colorCategoryFront].text
        : "text-inherit",
      colorCategoryBg
        ? colorDefinitions[themeColor][colorCategoryBg].bg
        : "bg-transparent",
      disabled && "disabled:opacity-75",
      truncate && "truncate",
      cursorPointer ? "cursor-pointer" : "cursor-text",
      fontMono && "font-mono",
      italic && "italic",
      fontWeight,
      appendClass,
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
  {#if prefixIcon}
    <BaseIcon {...prefixIcon} />
  {/if}
  <label for={inputId} class={customClass}>
    {text ? text : NO_DATA}<slot />
  </label>
  {#if suffixIcon}
    <BaseIcon {...suffixIcon} />
  {/if}
  {#if showCopyButton}
    <CommonCopyButton
      copyTarget={text ? text : NO_DATA}
      size={changeSize(textSize, -1)}
      colorCategory={colorCategoryFront}
    />
  {/if}
</div>
