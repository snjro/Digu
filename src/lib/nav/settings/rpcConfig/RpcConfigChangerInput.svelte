<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseInput from "$lib/base/BaseInput.svelte";
  import classNames from "classnames";
  import { createEventDispatcher, SvelteComponent } from "svelte";
  import type { HelperTextState } from "./RpcConfigChanger.svelte";

  export let disabled: boolean;
  export let value: number;
  export let helperTextState: HelperTextState;
  const dispatch = createEventDispatcher();
  let baseInputElement: SvelteComponent;

  $: if (disabled && helperTextState === "error") {
    baseInputElement.value = value;
  }
  async function change(event: Event): Promise<void> {
    const newValue: number = parseInt((event.target as HTMLInputElement).value);
    dispatch("change", { newValue: newValue });
  }
  async function focus(event: Event): Promise<void> {
    const newValue: number = parseInt((event.target as HTMLInputElement).value);
    if (newValue !== value) {
      change(event);
    }
  }
  function blur(): void {
    if (helperTextState !== "error") {
      helperTextState = undefined;
    }
  }
</script>

<div class={classNames("w-max")}>
  <BaseInput
    bind:this={baseInputElement}
    type="number"
    size={sizeSettings.navSettings}
    bind:value
    {disabled}
    {helperTextState}
    colorCategoryBorder={colorSettings.navSettings}
    colorCategory={colorSettings.navSettings}
    on:change={change}
    on:focus={focus}
    on:blur={blur}
  />
</div>
