<script lang="ts">
  import BaseSelect, { type BaseSelectProps } from "./BaseSelect.svelte";

  interface Props {
    items: BaseSelectProps["items"];
    value: string;
  }

  let { items, value = $bindable() }: Props = $props();
</script>

<BaseSelect {items} size="md" bind:value />
<span data-testid="bound">{value}</span>
