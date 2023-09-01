<script lang="ts">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import type {
    Chain,
    Contract,
    EventAbiFragment,
    Project,
    Version,
  } from "@constants/chains/types";
  import classNames from "classnames";
  import EventOverviewBasic from "./EventOverviewBasic.svelte";
  import EventOverviewContract from "./EventOverviewContract.svelte";
  import EventOverviewFetchedLogs from "./EventOverviewFetchedLogs.svelte";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
  export let targetEventAbiFragment: EventAbiFragment;

  const gridTrackBasic: string = classNames("col-span-full lg:col-span-1");
  const gridTrackFetchedLogs: string = classNames("col-span-full");
</script>

<PageWrapperContent gridCols="grid-cols-2">
  <svelte:fragment slot="PageWrapperContentBody">
    <CommonItemGroup text="Basic" gridTrack={gridTrackBasic}>
      <EventOverviewBasic {targetEventAbiFragment} />
    </CommonItemGroup>

    <CommonItemGroup text="Contract" gridTrack={gridTrackBasic}>
      <EventOverviewContract
        {targetChain}
        {targetProject}
        {targetVersion}
        {targetContract}
      />
    </CommonItemGroup>
    <CommonItemGroup text="Fetched Event Logs" gridTrack={gridTrackFetchedLogs}>
      <EventOverviewFetchedLogs
        {targetChain}
        {targetProject}
        {targetVersion}
        {targetContract}
        {targetEventAbiFragment}
      />
    </CommonItemGroup>
  </svelte:fragment>
</PageWrapperContent>
