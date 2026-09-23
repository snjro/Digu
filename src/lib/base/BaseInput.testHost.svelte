<script lang="ts">
  import BaseInput from "./BaseInput.svelte";

  export let value: string | number | undefined = undefined;
</script>

<BaseInput
  type="text"
  colorCategory="primary"
  colorCategoryBorder="primary"
  bind:value
/>
<span data-testid="bound">{value}</span>
