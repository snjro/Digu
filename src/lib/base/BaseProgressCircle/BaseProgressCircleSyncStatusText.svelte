<script lang="ts">
  import classNames from "classnames";
  import CommonSyncStateText, {
    type SyncStateTextLabelProps,
  } from "$lib/common/CommonSyncStateText.svelte";
  export let syncStateTextLabelProps: SyncStateTextLabelProps | undefined =
    undefined;
</script>

{#if syncStateTextLabelProps}
  <div class={classNames("w-full", "flex", "justify-center", "")}>
    <CommonSyncStateText
      showIcon={syncStateTextLabelProps.showIcon}
      colorCategoryFront={syncStateTextLabelProps.colorCategoryFront}
      size={syncStateTextLabelProps.size}
      syncStateText={syncStateTextLabelProps.syncStateText}
    />
  </div>
{/if}
