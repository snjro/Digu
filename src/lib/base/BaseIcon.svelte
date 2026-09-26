<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import classNames from "classnames";
  import { iconNames, type BaseIconProps } from "./BaseIcon";
  import type { BaseSize } from "./baseSizes";

  interface Props {
    name: BaseIconProps["name"];
    size?: NonNullable<BaseIconProps["size"]>;
    colorCategory?: BaseIconProps["colorCategory"];
    forcedClass?: BaseIconProps["forcedClass"];
    appendClass?: BaseIconProps["appendClass"];
    hoverEffect?: NonNullable<BaseIconProps["hoverEffect"]>;
    isHover?: NonNullable<BaseIconProps["isHover"]>;
    focusable?: NonNullable<BaseIconProps["focusable"]>;
    flipHorizontal?: NonNullable<BaseIconProps["flipHorizontal"]>;
    isHoverControlledByParent?: NonNullable<
      BaseIconProps["isHoverControlledByParent"]
    >;
    cursor?: "cursor-default" | "cursor-pointer";
  }

  let {
    name,
    size = "md",
    colorCategory = undefined,
    forcedClass = undefined,
    appendClass = undefined,
    hoverEffect = true,
    isHover = $bindable(false),
    focusable = "false",
    flipHorizontal = false,
    isHoverControlledByParent = false,
    cursor = "cursor-default",
  }: Props = $props();
  function onMouseEnter() {
    if (!isHoverControlledByParent) isHover = true;
  }
  function onMouseLeave() {
    if (!isHoverControlledByParent) isHover = false;
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

  let customClass: string = $derived(
    forcedClass ??
      classNames(
        appendClass,
        colorCategory &&
          classNames(
            hoverEffect && isHover
              ? colorClasses[colorCategory].fillEmphasis
              : colorClasses[colorCategory].fill,
          ),
        "",
      ),
  );

  let style = $derived(
    classNames(
      `min-width:${sizes[size]};`,
      `max-width:${sizes[size]};`,
      `min-height:${sizes[size]};`,
      `max-height:${sizes[size]};`,
      flipHorizontal && "transform: scale(-1,1);",
    ),
  );
</script>

<div
  {style}
  onmouseenter={onMouseEnter}
  onmouseleave={onMouseLeave}
  class={classNames(cursor, "w-fit", "h-fit")}
  role="presentation"
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
    <path d={iconNames[name]} class="" />
  </svg>
</div>
