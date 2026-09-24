<script lang="ts">
  import type { Chain, Project, Version } from "@constants/chains/types";
  import VersionOverviewSyncStatusProgress from "./VersionOverviewSyncStatusProgress.svelte";
  import VersionOverviewSyncStatusTarget from "./VersionOverviewSyncStatusTarget.svelte";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
  }

  let { targetChain, targetProject, targetVersion }: Props = $props();
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
