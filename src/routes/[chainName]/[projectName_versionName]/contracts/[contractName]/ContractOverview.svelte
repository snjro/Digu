<script lang="ts">
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import classNames from "classnames";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import ContractOverviewBasic from "./ContractOverviewBasic.svelte";
  import ContractOverviewCreation from "./ContractOverviewCreation.svelte";
  import ContractOverviewSyncStatus from "./ContractOverviewSyncStatus.svelte";
  import ContractOverviewFallback from "./ContractOverviewFallback.svelte";
  import ContractOverviewConstructor from "./ContractOverviewConstructor.svelte";
  import ContractOverviewEventsFunctions from "./ContractOverviewEventsFunctions.svelte";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
  export let hidden: boolean;

  let hasEvent: boolean;
  $: hasEvent = targetContract.events.abiFragments.length > 0;

  const gridMain: string = classNames(
    "grid",
    "grid-cols-6",
    "grid-flow-dense",
    "gap-3"
  );
  let gridTrackBasic: string;
  $: gridTrackBasic = classNames(
    "col-span-full",
    hasEvent && "md:col-span-4",
    ""
  );
  const gridTrackSync: string = classNames(
    "col-span-full",
    "md:col-span-2",
    "row-span-2",
    ""
  );
  const gridTrackEvents: string = classNames("col-span-full lg:col-span-3", "");
  const gridTrackFunction: string = classNames(
    "col-span-full lg:col-span-3",
    "row-span-3",
    ""
  );
</script>

<div class={classNames(gridMain, "w-full", "h-full", hidden && "hidden", "")}>
  <CommonItemGroup text="Basic" gridTrack={gridTrackBasic}>
    <ContractOverviewBasic
      {targetChain}
      {targetProject}
      {targetVersion}
      {targetContract}
    />
  </CommonItemGroup>

  <CommonItemGroup text="Creation" gridTrack={gridTrackBasic}>
    <ContractOverviewCreation {targetContract} />
  </CommonItemGroup>

  {#if hasEvent}
    <CommonItemGroup text="Sync Status" gridTrack={gridTrackSync}>
      <ContractOverviewSyncStatus
        {targetChain}
        {targetProject}
        {targetVersion}
        {targetContract}
      />
    </CommonItemGroup>
  {/if}

  <CommonItemGroup text="Events" gridTrack={gridTrackEvents}>
    <ContractOverviewEventsFunctions
      {targetContract}
      abiFragmentsType="events"
    />
  </CommonItemGroup>
  <CommonItemGroup text="Functions" gridTrack={gridTrackFunction}>
    <ContractOverviewEventsFunctions
      {targetContract}
      abiFragmentsType="functions"
    />
  </CommonItemGroup>
  <CommonItemGroup text="Fallback" gridTrack={gridTrackEvents}>
    <ContractOverviewFallback {targetContract} />
  </CommonItemGroup>
  <CommonItemGroup text="Constructor" gridTrack={gridTrackEvents}>
    <ContractOverviewConstructor {targetContract} />
  </CommonItemGroup>
</div>
