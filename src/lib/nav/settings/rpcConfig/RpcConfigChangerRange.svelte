<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseRange from "$lib/base/BaseRange.svelte";
  import { createEventDispatcher } from "svelte";
  import type { RpcConfigParam } from "./RpcConfig.svelte";

  export let rpcConfigParam: RpcConfigParam;
  export let disabled: boolean;
  export let value: number;
  const rpcConfigMinValue: RpcConfigParam["minValue"] = rpcConfigParam.minValue;
  const rpcConfigMaxValue: RpcConfigParam["maxValue"] = rpcConfigParam.maxValue;
  const rpcConfigStem: RpcConfigParam["step"] = rpcConfigParam.step;

  const dispatch = createEventDispatcher();

  async function change(event: Event): Promise<void> {
    const newValue: number = parseInt((event.target as HTMLInputElement).value);
    dispatch("change", { newValue: newValue });
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
  on:change={change}
/>
