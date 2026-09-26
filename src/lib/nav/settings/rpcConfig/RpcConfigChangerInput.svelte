<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseInput from "$lib/base/BaseInput.svelte";
  import classNames from "classnames";
  import type { HelperTextState } from "$lib/base/helperTextState";
  import type { RpcConfigParam } from "./rpcConfigParams";

  interface Props {
    rpcConfigParam: RpcConfigParam;
    disabled: boolean;
    value: number;
    onchange?: ((newValue: number) => void) | undefined;
    helperTextState: HelperTextState;
  }

  let {
    rpcConfigParam,
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
  // Number("") is 0, so read an empty input as NaN.
  function toNumber(text: string | number): number {
    return String(text).trim() === "" ? NaN : Number(text);
  }
  async function change(event: Event): Promise<void> {
    const newValue: number = toNumber((event.target as HTMLInputElement).value);
    onchange?.(newValue);
  }
  async function focus(event: Event): Promise<void> {
    const newValue: number = toNumber((event.target as HTMLInputElement).value);
    // BaseInput sets value to the typed string. Object.is treats NaN as NaN.
    if (!Object.is(newValue, toNumber(value))) {
      void change(event);
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
    ariaLabel={rpcConfigParam.label}
  />
</div>
