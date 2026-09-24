<script lang="ts">
  import BaseCheckbox from "./BaseCheckbox.svelte";

  interface Props {
    checked?: boolean | undefined;
    group?: string[];
    value?: string;
  }

  let {
    checked = $bindable(undefined),
    group = $bindable([]),
    value = "",
  }: Props = $props();
</script>

<BaseCheckbox bind:checked bind:group {value} />
<span data-testid="bound-checked">{checked}</span>
<span data-testid="bound-group">{group.join(",")}</span>
