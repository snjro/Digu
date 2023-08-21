<script lang="ts">
  import type { Chain, Project, Version } from "@constants/chains/types";
  import classNames from "classnames";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import VersionOverviewContracts from "./VersionOverviewContracts.svelte";
  import VersionOverviewSyncStatus from "./VersionOverviewSyncStatus.svelte";
  import CommonOverviewFrame from "$lib/common/CommonOverviewFrame.svelte";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;

  // let gridTrackBasic: string;
  // $: gridTrackBasic = classNames("col-span-full", "");
  const gridTrackSync: string = classNames("col-span-full lg:col-span-2", "");
  const gridTrackContracts: string = classNames(
    "col-span-full lg:col-span-4",
    ""
  );
</script>

<CommonOverviewFrame gridCols={6}>
  <CommonItemGroup text="Contracts" gridTrack={gridTrackContracts}>
    <VersionOverviewContracts {targetChain} {targetProject} {targetVersion} />
  </CommonItemGroup>

  <CommonItemGroup text="Sync Status" gridTrack={gridTrackSync}>
    <VersionOverviewSyncStatus {targetChain} {targetProject} {targetVersion} />
  </CommonItemGroup>
</CommonOverviewFrame>
