<script lang="ts">
  import classNames from "classnames";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { BaseSize } from "./baseSizes";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { iconNames, type BaseIconProps } from "./BaseIcon";

  export let name: BaseIconProps["name"];
  export let size: NonNullable<BaseIconProps["size"]> = "md";
  export let colorCategory: BaseIconProps["colorCategory"] = undefined;
  export let forcedClass: BaseIconProps["forcedClass"] = undefined;
  export let appendClass: BaseIconProps["appendClass"] = undefined;
  export let hoverEffect: NonNullable<BaseIconProps["hoverEffect"]> = true;
  export let isHover: NonNullable<BaseIconProps["isHover"]> = false;
  export let focusable: NonNullable<BaseIconProps["focusable"]> = "false";
  export let flipHorizontal: NonNullable<BaseIconProps["flipHorizontal"]> =
    false;
  export let isHoverControledByParent: NonNullable<
    BaseIconProps["isHoverControledByParent"]
  > = false;
  function onMouseEnter() {
    if (!isHoverControledByParent) isHover = true;
  }
  function onMouseLeave() {
    if (!isHoverControledByParent) isHover = false;
  }
  const sizes: { [key in BaseSize]: number } = {
    // xs: 12,
    // sm: 16,
    // md: 20,
    // lg: 24,
    // xl: 28,
    // "2xl": 32,
    // "3xl": 36,
    // "4xl": 40,
    // "5xl": 44,
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

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  let customClass: string;
  $: customClass =
    forcedClass ??
    classNames(
      appendClass,
      // hoverEffect && isHover
      //   ? colorCategory
      //     ? colorDefinitions[themeColor][colorCategory].fillEmphasis
      //     : "fill-inherit"
      //   : colorCategory
      //   ? colorDefinitions[themeColor][colorCategory].fill
      //   : "fill-inherit",
      // "",
      colorCategory &&
        classNames(
          hoverEffect && isHover
            ? colorDefinitions[themeColor][colorCategory].fillEmphasis
            : colorDefinitions[themeColor][colorCategory].fill
        ),
      ""
    );
  $: style = classNames(
    `min-width:${sizes[size]};`,
    `max-width:${sizes[size]};`,
    `min-height:${sizes[size]};`,
    `max-height:${sizes[size]};`,
    flipHorizontal && "transform: scale(-1,1);"
  );
</script>

<button
  {style}
  on:mouseenter={onMouseEnter}
  on:mouseleave={onMouseLeave}
  class={classNames("cursor-default", "w-fit", "h-fit")}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    id={name}
    viewBox="0 0 24 24"
    width={sizes[size]}
    height={sizes[size]}
    {focusable}
    class={customClass}
    {style}
  >
    <path d={iconNames[name]} class={""} />
  </svg>
</button>
