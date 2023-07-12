<script lang="ts">
  import type { Chain, Project, Version } from "@constants/chains/types";
  import VersionOverviewSyncStatusTarget from "./VersionOverviewSyncStatusTarget.svelte";
  import VersionOverviewSyncStatusProgress from "./VersionOverviewSyncStatusProgress.svelte";
  import VersionOverviewSyncStatusCurrentState from "./VersionOverviewSyncStatusCurrentState.svelte";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
</script>

<VersionOverviewSyncStatusTarget
  {targetChain}
  {targetProject}
  {targetVersion}
/>
<VersionOverviewSyncStatusCurrentState
  {targetChain}
  {targetProject}
  {targetVersion}
/>
<VersionOverviewSyncStatusProgress
  {targetChain}
  {targetProject}
  {targetVersion}
/>
