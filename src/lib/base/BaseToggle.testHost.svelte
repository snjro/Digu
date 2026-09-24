<script lang="ts">
  import BaseToggle from "./BaseToggle.svelte";

  interface Props {
    toggleValue: boolean;
  }

  let { toggleValue = $bindable() }: Props = $props();
</script>

<BaseToggle colorCategoryTrack="primary" disabled={false} bind:toggleValue />
<span data-testid="bound">{toggleValue}</span>
