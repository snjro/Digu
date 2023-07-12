<script lang="ts">
  import classNames from "classnames";
  import SyncStatusProgressbar from "./SyncStatusProgressbar.svelte";
  import SyncStatusToggle from "./SyncStatusToggle.svelte";
</script>

<div class={classNames("flex", "flex-col", "max-w-xs", "w-40", "space-y-1")}>
  <SyncStatusToggle />
  <SyncStatusProgressbar />
</div>
