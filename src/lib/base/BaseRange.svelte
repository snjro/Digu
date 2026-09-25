<script lang="ts" module>
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
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import type { BaseSize } from "./baseSizes";
  interface Props {
    min: BaseRangeProps["min"];
    max: BaseRangeProps["max"];
    value: BaseRangeProps["value"];
    step: BaseRangeProps["step"];
    size?: NonNullable<BaseRangeProps["size"]>;
    disabled?: NonNullable<BaseRangeProps["disabled"]>;
    forcedClass?: BaseRangeProps["forcedClass"];
    appendClass?: BaseRangeProps["appendClass"];
    colorCategoryFront?: ColorCategory | undefined;
    colorCategoryBg?: ColorCategory | undefined;
    onchange?: ((event: Event) => void) | undefined;
    ariaLabel?: string;
  }

  let {
    min,
    max,
    value = $bindable(),
    step,
    size = "sm",
    disabled = false,
    forcedClass = undefined,
    appendClass = undefined,
    colorCategoryFront = undefined,
    colorCategoryBg = undefined,
    onchange = undefined,
    ariaLabel = undefined,
  }: Props = $props();

  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  let customClass: string = $derived(
    forcedClass ??
      classNames(
        "w-full",
        "rounded-lg",
        "appearance-none",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        colorCategoryBg
          ? colorDefinitions[themeColor][colorCategoryBg].bg
          : "bg-inherit",
        "shadow-sm dark:shadow-none",
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
        appendClass,
      ),
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
  {onchange}
  aria-label={ariaLabel}
/>
