<script lang="ts">
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import ContractOverviewSyncStatusProgress from "./ContractOverviewSyncStatusProgress.svelte";
  import ContractOverviewSyncStatusTarget from "./ContractOverviewSyncStatusTarget.svelte";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
    targetContract: Contract;
  }

  let { targetChain, targetProject, targetVersion, targetContract }: Props =
    $props();
</script>

<ContractOverviewSyncStatusTarget
  {targetChain}
  {targetProject}
  {targetVersion}
  {targetContract}
/>
<ContractOverviewSyncStatusProgress
  {targetChain}
  {targetProject}
  {targetVersion}
  {targetContract}
/>
