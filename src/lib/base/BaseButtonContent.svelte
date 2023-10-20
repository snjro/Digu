<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import { baseTextSizes, type BaseSize } from "./baseSizes";

  export let label: string | undefined;
  export let size: BaseSize;
  export let underlineLabel: boolean;
  export let designatedFontWeight:
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
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;
</script>

{#if $$slots.prefixIcon}
  <slot name="prefixIcon" />
{/if}
{#if label}
  <div
    class={classNames(
      "border-b-2",
      "overflow-x-hidden",
      underlineLabel
        ? colorDefinitions[themeColor]["interactive"].border
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
{#if $$slots.suffixIcon}
  <slot name="suffixIcon" />
{/if}
