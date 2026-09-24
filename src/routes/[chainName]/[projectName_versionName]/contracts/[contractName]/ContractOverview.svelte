<script lang="ts">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import { hasSyncTargetEvents } from "@utils/utilsEthers";
  import classNames from "classnames";
  import ContractOverviewBasic from "./ContractOverviewBasic.svelte";
  import ContractOverviewConstructor from "./ContractOverviewConstructor.svelte";
  import ContractOverviewCreation from "./ContractOverviewCreation.svelte";
  import ContractOverviewEventsFunctions from "./ContractOverviewEventsFunctions.svelte";
  import ContractOverviewFallback from "./ContractOverviewFallback.svelte";
  import ContractOverviewSyncStatus from "./ContractOverviewSyncStatus.svelte";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
    targetContract: Contract;
  }

  let { targetChain, targetProject, targetVersion, targetContract }: Props =
    $props();

  let hasEvent: boolean = $derived(hasSyncTargetEvents(targetContract));

  let gridTrackBasic: string = $derived(
    classNames("col-span-full", hasEvent && "md:col-span-4", ""),
  );

  const gridTrackSync: string = classNames(
    "col-span-full",
    "md:col-span-2",
    "row-span-2",
    "",
  );
  const gridTrackEvents: string = classNames("col-span-full lg:col-span-3", "");
  const gridTrackFunction: string = classNames(
    "col-span-full lg:col-span-3",
    "row-span-3",
    "",
  );
</script>

<PageWrapperContent gridCols="grid-cols-6">
  {#snippet PageWrapperContentBody()}
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
  {/snippet}
</PageWrapperContent>
