<script lang="ts">
  import BaseSelect, { type BaseSelectProps } from "./BaseSelect.svelte";

  export let items: BaseSelectProps["items"];
  export let value: string;
</script>

<BaseSelect {items} size="md" bind:value />
<span data-testid="bound">{value}</span>
