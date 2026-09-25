<script lang="ts" module>
  export type BaseAProps = {
    href: string | undefined;
    text?: string;
    colorCategory?: ColorCategory;
    textSize?: BaseSize;
    forcedClass?: string;
    appendClass?: string;
    prefixIcon?: BaseIconProps;
    suffixIcon?: BaseIconProps;
    disabled?: boolean;
    isHoverControledByParent?: boolean;
    openNewTab?: boolean;
    hoverEffect?: boolean;
    truncate?: boolean;
    ariaLabel?: string;
  };
  export const setPropsByOpenNewTab = (
    openNewTab: boolean,
  ): { target: string; rel: string } | undefined => {
    if (openNewTab) {
      return { target: "_blank", rel: "noreferrer noopener" };
    } else {
      return undefined;
    }
  };
</script>

<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import type { Snippet } from "svelte";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { NO_DATA } from "@utils/utilsConstants";
  import classNames from "classnames";
  import { twMerge } from "tailwind-merge";
  import type { BaseIconProps } from "./BaseIcon";
  import BaseIcon from "./BaseIcon.svelte";
  import type { BaseSize } from "./baseSizes";
  import { baseTextSizes } from "./baseSizes";
  interface Props {
    href: BaseAProps["href"];
    text?: BaseAProps["text"];
    colorCategory?: BaseAProps["colorCategory"];
    textSize?: BaseSize;
    forcedClass?: BaseAProps["forcedClass"];
    appendClass?: BaseAProps["appendClass"];
    prefixIcon?: BaseAProps["prefixIcon"];
    suffixIcon?: BaseAProps["suffixIcon"];
    disabled?: NonNullable<BaseAProps["disabled"]>;
    openNewTab?: NonNullable<BaseAProps["openNewTab"]>;
    isFontMono?: boolean;
    isHoverControledByParent?: NonNullable<
      BaseAProps["isHoverControledByParent"]
    >;
    hoverEffect?: NonNullable<BaseAProps["hoverEffect"]>;
    truncate?: NonNullable<BaseAProps["truncate"]>;
    ariaLabel?: BaseAProps["ariaLabel"];
    anchorContent?: Snippet;
  }

  let {
    href,
    text = undefined,
    colorCategory = undefined,
    textSize = "md",
    forcedClass = undefined,
    appendClass = undefined,
    prefixIcon = undefined,
    suffixIcon = undefined,
    disabled = false,
    openNewTab = true,
    isFontMono = false,
    isHoverControledByParent = false,
    hoverEffect = true,
    truncate = true,
    ariaLabel = undefined,
    anchorContent,
  }: Props = $props();
  let isHover = $state(false);
  function onMouseEnter() {
    if (!isHoverControledByParent) isHover = true;
  }
  function onMouseLeave() {
    if (!isHoverControledByParent) isHover = false;
  }
  // Returns a new object, so that the props of the parent are not changed.
  const editIconProps = (
    iconProps: BaseIconProps | undefined,
  ): BaseIconProps | undefined => {
    if (!iconProps) return undefined;
    return {
      ...iconProps,
      isHover,
      size: iconProps.size || textSize,
      colorCategory:
        iconProps.colorCategory || (colorCategory ?? "interactive"),
    };
  };
  const displayText: string | undefined = $derived(text || href);
  let editedPrefixIcon = $derived(editIconProps(prefixIcon));
  let editedSuffixIcon = $derived(editIconProps(suffixIcon));
  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);
  let customClass: string = $derived(
    forcedClass ??
      twMerge(
        "flex",
        "items-center",
        "space-x-1",
        "cursor-pointer",
        "max-w-fit",
        "overflow-x-hidden",
        "whitespace-nowrap",
        // "w-fit",
        hoverEffect && "hover:underline",
        baseTextSizes[textSize],
        colorDefinitions[themeColor][colorCategory ?? "interactive"].text,
        disabled && "disabled:opacity-75",
        disabled && "pointer-events: none",
        isFontMono && "font-mono",
        appendClass,
      ),
  );
</script>

<a
  href={href ?? NO_DATA}
  class={customClass}
  aria-label={ariaLabel}
  {...setPropsByOpenNewTab(openNewTab)}
  onmouseenter={onMouseEnter}
  onmouseleave={onMouseLeave}
>
  {#if editedPrefixIcon}
    <BaseIcon {...editedPrefixIcon} />
  {/if}
  {#if anchorContent}
    {@render anchorContent?.()}
  {:else}
    <p class={classNames(truncate && "truncate")}>{displayText ?? NO_DATA}</p>
  {/if}
  {#if editedSuffixIcon}
    <BaseIcon {...editedSuffixIcon} />
  {/if}
</a>
