<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseRange from "$lib/base/BaseRange.svelte";
  import type { RpcConfigParam } from "./rpcConfigParams";

  interface Props {
    rpcConfigParam: RpcConfigParam;
    disabled: boolean;
    value: number;
    onchange?: ((newValue: number) => void) | undefined;
  }

  let {
    rpcConfigParam,
    disabled,
    value,
    onchange = undefined,
  }: Props = $props();
  let rpcConfigMinValue: RpcConfigParam["minValue"] = $derived(
    rpcConfigParam.minValue,
  );
  let rpcConfigMaxValue: RpcConfigParam["maxValue"] = $derived(
    rpcConfigParam.maxValue,
  );
  let rpcConfigStem: RpcConfigParam["step"] = $derived(rpcConfigParam.step);

  async function change(event: Event): Promise<void> {
    const newValue: number = parseInt((event.target as HTMLInputElement).value);
    onchange?.(newValue);
  }
</script>

<BaseRange
  max={rpcConfigMaxValue}
  min={rpcConfigMinValue}
  step={rpcConfigStem}
  size={sizeSettings.navSettings}
  {disabled}
  colorCategoryFront="interactive"
  colorCategoryBg={colorSettings.navSettings}
  {value}
  onchange={change}
  ariaLabel={`${rpcConfigParam.label} slider`}
/>
