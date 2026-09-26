<script lang="ts">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import type { Chain, Project, Version } from "@constants/chains/types";
  import classNames from "classnames";
  import VersionOverviewContracts from "./VersionOverviewContracts.svelte";
  import VersionOverviewSyncStatus from "./VersionOverviewSyncStatus.svelte";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
  }

  let { targetChain, targetProject, targetVersion }: Props = $props();

  // let gridTrackBasic: string;
  // $: gridTrackBasic = classNames("col-span-full", "");
  const gridTrackSync: string = classNames("col-span-full lg:col-span-2", "");
  const gridTrackContracts: string = classNames(
    "col-span-full lg:col-span-4",
    "",
  );
</script>

<PageWrapperContent gridCols="grid-cols-6" hasMultipleTabs={false}>
  {#snippet PageWrapperContentBody()}
    <CommonItemGroup text="Contracts" gridTrack={gridTrackContracts}>
      <VersionOverviewContracts {targetChain} {targetProject} {targetVersion} />
    </CommonItemGroup>

    <CommonItemGroup text="Sync Status" gridTrack={gridTrackSync}>
      <VersionOverviewSyncStatus
        {targetChain}
        {targetProject}
        {targetVersion}
      />
    </CommonItemGroup>
  {/snippet}
</PageWrapperContent>
