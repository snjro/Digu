<script lang="ts">
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import ContractOverviewSyncStatusTarget from "./ContractOverviewSyncStatusTarget.svelte";
  import ContractOverviewSyncStatusProgress from "./ContractOverviewSyncStatusProgress.svelte";

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
