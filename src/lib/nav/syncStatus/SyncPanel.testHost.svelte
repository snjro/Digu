<script lang="ts">
  import SyncPanel from "./SyncPanel.svelte";

  interface Props {
    // Like the dialog of the import of the warp sync, outside of the panel.
    withDialog?: boolean;
  }

  let { withDialog = false }: Props = $props();

  let open: boolean = $state(false);
  let trigger: HTMLButtonElement | undefined = $state();
</script>

<!-- Like the progress in the nav. -->
<button bind:this={trigger} aria-expanded={open} onclick={() => (open = !open)}
  >Open the panel</button
>
<input aria-label="Elsewhere" />
{#if withDialog}
  <dialog open><button>In the dialog</button></dialog>
{/if}
<SyncPanel bind:open triggerElement={trigger} />
