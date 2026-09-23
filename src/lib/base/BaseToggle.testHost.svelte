<script lang="ts">
  import BaseToggle from "./BaseToggle.svelte";

  export let toggleValue: boolean;
</script>

<BaseToggle colorCategoryTrack="primary" disabled={false} bind:toggleValue />
<span data-testid="bound">{toggleValue}</span>
