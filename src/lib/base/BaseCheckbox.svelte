<script lang="ts">
  import {
    colorDefinitions,
    type ColorDefinitionForParts,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import { radioSizes } from "./BaseRadio.svelte";
  import type { BaseSize } from "./baseSizes";
  import { base } from "$app/paths";

  interface Props {
    size?: BaseSize;
    group?: string[];
    value?: string;
    checked?: boolean | undefined;
    indeterminate?: boolean;
    disabled?: boolean;
    onclick?: ((event: MouseEvent) => void) | undefined;
    ariaLabel?: string;
  }

  let {
    size = "md",
    group = $bindable([]),
    value = "",
    checked = $bindable(undefined),
    indeterminate = $bindable(false),
    disabled = false,
    onclick = undefined,
    ariaLabel = undefined,
  }: Props = $props();
  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  // New arrays, so that a parent in legacy mode also sees the change.
  $effect.pre(() => {
    const index = group.indexOf(value);
    if (checked === undefined) checked = index >= 0;
    if (checked) {
      if (index < 0) group = [...group, value];
    } else {
      if (index >= 0) group = group.filter((_, i) => i !== index);
    }
  });
  let checkboxStyle: {
    backgroundColor: ColorDefinitionForParts["bg"];
    checkboxImageFile: string;
  } = $derived.by(() => {
    if (indeterminate) {
      return {
        backgroundColor: "bg-yellow-500",
        checkboxImageFile: `${base}/checkboxIndeterminate.svg`,
      };
    } else if (checked) {
      return {
        backgroundColor: colorDefinitions[themeColor]["success"].bg,
        checkboxImageFile: `${base}/checkboxChecked.svg`,
      };
    } else {
      return {
        backgroundColor: colorDefinitions[themeColor]["error"].bg,
        checkboxImageFile: `${base}/checkboxCross.svg`,
      };
    }
  });
</script>

<input
  type="checkbox"
  bind:checked
  {onclick}
  bind:indeterminate
  {value}
  {disabled}
  aria-label={ariaLabel}
  class={classNames(
    radioSizes[size],
    "rounded-sm",
    checkboxStyle.backgroundColor,
    "appearance-none",
    "disabled:opacity-50",
    "cursor-pointer disabled:cursor-not-allowed",
  )}
  style="--url: url({checkboxStyle.checkboxImageFile})"
/>

<style lang="scss">
  input[type="checkbox"] {
    background-image: var(--url);
  }
</style>
