<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseInput from "$lib/base/BaseInput.svelte";
  import classNames from "classnames";
  import type { HelperTextState } from "./RpcConfigChanger.svelte";

  export let disabled: boolean;
  export let value: number;
  export let onchange: ((newValue: number) => void) | undefined = undefined;
  export let helperTextState: HelperTextState;
  let baseInputElement: ReturnType<typeof BaseInput>;

  $: if (disabled && helperTextState === "error") {
    baseInputElement.setValue(value);
  }
  async function change(event: Event): Promise<void> {
    const newValue: number = parseInt((event.target as HTMLInputElement).value);
    onchange?.(newValue);
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
