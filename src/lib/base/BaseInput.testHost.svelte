<script lang="ts">
  import BaseInput from "./BaseInput.svelte";

  interface Props {
    value?: string | number | undefined;
  }

  let { value = $bindable(undefined) }: Props = $props();
</script>

<BaseInput
  type="text"
  colorCategory="primary"
  colorCategoryBorder="primary"
  bind:value
/>
<span data-testid="bound">{value}</span>
