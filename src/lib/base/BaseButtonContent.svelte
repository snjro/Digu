<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import type { Snippet } from "svelte";
  import classNames from "classnames";
  import { baseTextSizes, type BaseSize } from "./baseSizes";

  interface Props {
    label: string | undefined;
    size: BaseSize;
    underlineLabel: boolean;
    designatedFontWeight:
      | "font-thin"
      | "font-extralight"
      | "font-light"
      | "font-normal"
      | "font-medium"
      | "font-semibold"
      | "font-bold"
      | "font-extrabold"
      | "font-black"
      | undefined;
    prefixIcon?: Snippet;
    suffixIcon?: Snippet;
  }

  let {
    label,
    size,
    underlineLabel,
    designatedFontWeight,
    prefixIcon,
    suffixIcon,
  }: Props = $props();
</script>

{#if prefixIcon}
  {@render prefixIcon?.()}
{/if}
{#if label}
  <div
    class={classNames(
      "border-b-2",
      "overflow-x-hidden",
      underlineLabel
        ? colorClasses["interactive"].border
        : "border-transparent",
    )}
  >
    <span
      class={classNames(
        "truncate",
        designatedFontWeight,
        "cursor-pointer",
        baseTextSizes[size],
      )}
    >
      {label}
    </span>
  </div>
{/if}
{#if suffixIcon}
  {@render suffixIcon?.()}
{/if}
