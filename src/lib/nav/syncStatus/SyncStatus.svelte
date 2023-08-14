<script lang="ts">
  import classNames from "classnames";
  import SyncStatusProgressbar from "./SyncStatusProgressbar.svelte";
  import SyncStatusToggle from "./SyncStatusToggle.svelte";
</script>

<div class={classNames("flex", "flex-col", "max-w-[140px]", "w-full")}>
  <SyncStatusToggle />
  <SyncStatusProgressbar />
</div>
