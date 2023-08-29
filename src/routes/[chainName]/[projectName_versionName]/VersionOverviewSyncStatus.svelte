<script lang="ts">
  import type { Chain, Project, Version } from "@constants/chains/types";
  import VersionOverviewSyncStatusProgress from "./VersionOverviewSyncStatusProgress.svelte";
  import VersionOverviewSyncStatusTarget from "./VersionOverviewSyncStatusTarget.svelte";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
</script>

<VersionOverviewSyncStatusTarget
  {targetChain}
  {targetProject}
  {targetVersion}
/>
<VersionOverviewSyncStatusProgress
  {targetChain}
  {targetProject}
  {targetVersion}
/>
