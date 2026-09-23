<script lang="ts">
  import BaseRadio, { type RadioLabelAndValues } from "./BaseRadio.svelte";

  export let radioButtonType: "button" | "tab" | "circle";
  export let labelAndValues: RadioLabelAndValues<string>;
  export let selectedValue: string;
</script>

<BaseRadio
  {radioButtonType}
  groupName="group"
  size="md"
  {labelAndValues}
  bind:selectedValue
/>
<span data-testid="bound">{selectedValue}</span>
