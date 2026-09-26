<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import CommonChainExplorerLink from "$lib/common/CommonChainExplorerLink.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import type { SyncStatusContract } from "@db/dbTypes";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { NO_DATA } from "@utils/utilsConstants";
  import {
    getBlockNumberByHeaderName,
    type HeaderName,
  } from "./syncStatusBlockNumber";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
    targetContract: Contract;
    headerName: HeaderName;
  }

  let {
    targetChain,
    targetProject,
    targetVersion,
    targetContract,
    headerName,
  }: Props = $props();
  const gridSize: BaseSize = sizeSettings.grid;

  let latestBlockNumber: number = $derived(
    $storeChainStatus[targetChain.name].latestBlockNumber,
  );

  let targetContractSyncStatus: SyncStatusContract = $derived(
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name],
  );

  let blockNumber: number = $derived(
    getBlockNumberByHeaderName(
      headerName,
      latestBlockNumber,
      targetContractSyncStatus,
    ),
  );
</script>

<!-- Like the valueGetter of the column, 0 is no block. -->
{#if targetContractSyncStatus && blockNumber !== 0}
  <CommonChainExplorerLink
    subdirectory="block"
    value={blockNumber.toString()}
    textSize={gridSize}
  />
{:else}
  <BaseLabel text={NO_DATA} textSize={gridSize} />
{/if}
