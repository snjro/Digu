<script lang="ts">
  import classNames from "classnames";
  import type {
    Chain,
    Project,
    Version,
    Contract,
    EventAbiFragment,
  } from "@constants/chains/types";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import EventOverviewBasic from "./EventOverviewBasic.svelte";
  import EventOverviewFetchedLogs from "./EventOverviewFetchedLogs.svelte";
  import EventOverviewContract from "./EventOverviewContract.svelte";
  import CommonOverviewFrame from "$lib/common/CommonOverviewFrame.svelte";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
  export let targetEventAbiFragment: EventAbiFragment;
  export let hidden: boolean;

  const gridTrackBasic: string = classNames("col-span-full lg:col-span-1");
  const gridTrackFetchedLogs: string = classNames("col-span-full");
</script>

<CommonOverviewFrame gridCols={2} {hidden}>
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
</CommonOverviewFrame>
