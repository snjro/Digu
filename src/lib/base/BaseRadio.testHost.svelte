<script lang="ts">
  import BaseRadio, { type RadioLabelAndValues } from "./BaseRadio.svelte";

  interface Props {
    radioButtonType: "button" | "tab" | "circle";
    labelAndValues: RadioLabelAndValues<string>;
    selectedValue: string;
  }

  let {
    radioButtonType,
    labelAndValues,
    selectedValue = $bindable(),
  }: Props = $props();
</script>

<BaseRadio
  {radioButtonType}
  groupName="group"
  size="md"
  {labelAndValues}
  bind:selectedValue
/>
<span data-testid="bound">{selectedValue}</span>
