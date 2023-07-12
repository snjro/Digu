<script lang="ts">
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import ContractOverviewSyncStatusTarget from "./ContractOverviewSyncStatusTarget.svelte";
  import ContractOverviewSyncStatusProgress from "./ContractOverviewSyncStatusProgress.svelte";
  import ContractOverviewSyncStatusCurrentState from "./ContractOverviewSyncStatusCurrentState.svelte";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
</script>

<ContractOverviewSyncStatusCurrentState
  {targetChain}
  {targetProject}
  {targetVersion}
  {targetContract}
/>
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
