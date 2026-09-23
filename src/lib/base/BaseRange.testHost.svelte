<script lang="ts">
  import BaseRange from "./BaseRange.svelte";

  export let value: number;
</script>

<BaseRange min={0} max={100} step={10} bind:value />
<span data-testid="bound">{value}</span>
