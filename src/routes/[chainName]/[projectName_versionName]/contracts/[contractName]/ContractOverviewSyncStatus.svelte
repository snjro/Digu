<script lang="ts">
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import ContractOverviewSyncStatusProgress from "./ContractOverviewSyncStatusProgress.svelte";
  import ContractOverviewSyncStatusTarget from "./ContractOverviewSyncStatusTarget.svelte";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
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
