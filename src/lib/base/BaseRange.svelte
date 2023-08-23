<script lang="ts" context="module">
  export type BaseRangeProps = {
    min: number;
    max: number;
    value: number;
    step: number;
    size?: BaseSize;
    disabled?: boolean;
    forcedClass?: string;
    appendClass?: string;
  };
  const sizes: { [key in BaseSize]: string } = {
    xs: "h-1",
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
    xl: "h-5",
    "2xl": "h-6",
    "3xl": "h-7",
    "4xl": "h-8",
    "5xl": "h-9",
  };
</script>

<script lang="ts">
  import classNames from "classnames";
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { BaseSize } from "./baseSizes";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  export let min: BaseRangeProps["min"];
  export let max: BaseRangeProps["max"];
  export let value: BaseRangeProps["value"];
  export let step: BaseRangeProps["step"];
  export let size: NonNullable<BaseRangeProps["size"]> = "sm";
  export let disabled: NonNullable<BaseRangeProps["disabled"]> = false;
  export let forcedClass: BaseRangeProps["forcedClass"] = undefined;
  export let appendClass: BaseRangeProps["appendClass"] = undefined;
  export let colorCategoryFront: ColorCategory | undefined = undefined;
  export let colorCategoryBg: ColorCategory | undefined = undefined;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  let customClass: string;
  $: customClass =
    forcedClass ??
    classNames(
      "w-full",
      "rounded-lg",
      "appearance-none",
      disabled ? "cursor-not-allowed" : "cursor-pointer",
      colorCategoryBg
        ? colorDefinitions[themeColor][colorCategoryBg].bg
        : "bg-inherit",
      "shadow dark:shadow-none",
      colorCategoryBg
        ? colorDefinitions[themeColor][colorCategoryBg].shadow
        : "shadow-inherit",
      colorCategoryFront
        ? colorDefinitions[themeColor][colorCategoryFront].text
        : "text-inherit",
      colorCategoryFront
        ? colorDefinitions[themeColor][colorCategoryFront].accent
        : "accent-inherit",
      "dark:border",
      colorCategoryBg
        ? colorDefinitions[themeColor][colorCategoryBg].border
        : "border-inherit",
      sizes[size],
      appendClass
    );
</script>

<input
  type="range"
  bind:value
  class={customClass}
  {min}
  {max}
  {step}
  {disabled}
  on:change
  on:click
  on:keydown
  on:keypress
  on:keyup
/>
