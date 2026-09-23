<script lang="ts">
  import BaseCheckbox from "./BaseCheckbox.svelte";

  export let checked: boolean | undefined = undefined;
  export let group: string[] = [];
  export let value: string = "";
</script>

<BaseCheckbox bind:checked bind:group {value} />
<span data-testid="bound-checked">{checked}</span>
<span data-testid="bound-group">{group.join(",")}</span>
