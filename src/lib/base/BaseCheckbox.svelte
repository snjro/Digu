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

  export let size: BaseSize = "md";
  export let group: string[] = [];
  export let value: string = "";
  export let checked: boolean | undefined = undefined;
  export let indeterminate: boolean = false;
  export let disabled: boolean = false;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  $: {
    const index = group.indexOf(value);
    if (checked === undefined) checked = index >= 0;
    if (checked) {
      if (index < 0) {
        group.push(value);
        group = group;
      }
    } else {
      if (index >= 0) {
        group.splice(index, 1);
        group = group;
      }
    }
  }
  let backgroundColor: ColorDefinitionForParts["bg"];
  let checkboxImageFile: string;
  $: {
    if (indeterminate) {
      backgroundColor = "bg-yellow-500";
      checkboxImageFile = "/checkboxIndeterminate.svg";
    } else if (checked) {
      backgroundColor = colorDefinitions[themeColor]["success"].bg;
      checkboxImageFile = "/checkboxChecked.svg";
    } else {
      backgroundColor = colorDefinitions[themeColor]["error"].bg;
      checkboxImageFile = "/checkboxCross.svg";
    }
  }
</script>

<input
  type="checkbox"
  bind:checked
  on:keyup
  on:keydown
  on:keypress
  on:focus
  on:blur
  on:click
  on:mouseover
  on:mouseenter
  on:mouseleave
  on:paste
  bind:indeterminate
  {value}
  {disabled}
  class={classNames(
    radioSizes[size],
    "rounded",
    backgroundColor,
    "appearance-none",
    "disabled:opacity-50",
    "cursor-pointer disabled:cursor-not-allowed",
  )}
  style="--url: url({checkboxImageFile})"
/>

<style lang="scss">
  input[type="checkbox"] {
    background-image: var(--url);
  }
</style>
