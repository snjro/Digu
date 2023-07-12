<script lang="ts">
  import classNames from "classnames";
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type { ThemeColor } from "@db/dbTypes";
  import { iconNames, type BaseIconProps } from "$lib/base/BaseIcon";
  export let colorCategory: ColorCategory;
  export let themeColor: ThemeColor;

  export let fillType: "opacity" | "emphasis" | "normal" = "normal";
  let name: BaseIconProps["name"] = "archive";
  let size: NonNullable<BaseIconProps["size"]> = "md";

  const sizes: { [key in BaseSize]: number } = {
    xs: 10,
    sm: 14,
    md: 18,
    lg: 22,
    xl: 26,
    "2xl": 30,
    "3xl": 34,
    "4xl": 38,
    "5xl": 42,
  };

  let customClass: string = classNames(getFill());
  function getFill(): string {
    switch (fillType) {
      case "opacity":
        return colorDefinitions[themeColor][colorCategory].fillOpacity;

      case "emphasis":
        return colorDefinitions[themeColor][colorCategory].fillEmphasis;
      default:
        return colorDefinitions[themeColor][colorCategory].fill;
    }
  }
  $: style = classNames(
    `min-width:${sizes[size]};`,
    `max-width:${sizes[size]};`,
    `min-height:${sizes[size]};`,
    `max-height:${sizes[size]};`
  );
</script>

<div {style}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    id={name}
    viewBox="0 0 24 24"
    width={sizes[size]}
    height={sizes[size]}
    class={customClass}
    {style}
  >
    <path d={iconNames[name]} />
  </svg>
</div>
