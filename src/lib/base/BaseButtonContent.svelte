<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import type { BaseButtonProps } from "./BaseButton.svelte";
  import BaseLabel from "./BaseLabel.svelte";

  export let label: BaseButtonProps["label"];
  export let size: NonNullable<BaseButtonProps["size"]>;
  export let underlineLabel: boolean;
  export let designatedFontWeight: BaseButtonProps["designatedFontWeight"];

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
