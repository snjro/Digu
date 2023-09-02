<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import BaseLabel, { type BaseLabelProps } from "./BaseLabel.svelte";
  import type { BaseSize } from "./baseSizes";

  export let label: string | undefined;
  export let size: BaseSize;
  export let underlineLabel: boolean;
  export let designatedFontWeight: BaseLabelProps["fontWeight"];

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
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
    <BaseLabel
      text={label}
      textSize={size}
      cursorPointer
      truncate
      fontWeight={designatedFontWeight}
    />
  </div>
{/if}
{#if $$slots.suffixIcon}
  <slot name="suffixIcon" />
{/if}
