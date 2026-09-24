<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseInput from "$lib/base/BaseInput.svelte";
  import classNames from "classnames";
  import type { HelperTextState } from "./RpcConfigChanger.svelte";

  interface Props {
    disabled: boolean;
    value: number;
    onchange?: ((newValue: number) => void) | undefined;
    helperTextState: HelperTextState;
  }

  let {
    disabled,
    value = $bindable(),
    onchange = undefined,
    helperTextState,
  }: Props = $props();
  let baseInputElement = $state() as ReturnType<typeof BaseInput>;

  $effect.pre(() => {
    if (disabled && helperTextState === "error") {
      // Runs before bind:this on creation, when the input already shows value.
      baseInputElement?.setValue(value);
    }
  });
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
    onchange={change}
    onfocus={focus}
    onblur={blur}
  />
</div>
