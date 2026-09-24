<script lang="ts">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import type { Chain } from "@constants/chains/types";
  import classNames from "classnames";
  import ChainOverviewVersions from "./ChainOverviewVersions.svelte";

  interface Props {
    targetChain: Chain;
  }

  let { targetChain }: Props = $props();

  const gridTrackContracts: string = classNames("col-span-full", "");
</script>

<PageWrapperContent gridCols="grid-cols-6" hasMultipulTabs={false}>
  {#snippet PageWrapperContentBody()}
    {#each targetChain.projects as targetProject}
      <CommonItemGroup
        text={`${targetProject.name}`}
        gridTrack={gridTrackContracts}
      >
        <ChainOverviewVersions {targetChain} {targetProject} />
      </CommonItemGroup>
    {/each}
  {/snippet}
</PageWrapperContent>
