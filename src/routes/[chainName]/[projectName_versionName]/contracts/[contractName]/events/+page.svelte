<script lang="ts">
  import { page } from "$app/state";
  import PageWrapper from "$lib/PageWrapper/PageWrapper.svelte";
  import BaseGrid from "$lib/grid/BaseGrid.svelte";
  import type { Contract } from "@constants/chains/types";
  import { trailingSlash } from "@routes/+layout";
  import type { LoadEventsData } from "./+page";
  import { columnDefs } from "./columnDefs";
  import { gridRows } from "./gridRows";
  import type { EventRow } from "$lib/gridColumnDefs/rowTypes";
  import { getMaxParamsLength } from "../../maxParamsLength";

  interface Props {
    data: LoadEventsData;
  }

  let { data }: Props = $props();

  let titleText: Contract["name"] = $derived(data.targetContract.name);

  const titleCategoryLabelText: string = "Events";

  let rows: EventRow[] = $derived(gridRows(data.targetEventAbiFragments));

  let isFullScreen = $state(false);
</script>

<PageWrapper
  titleProps={{
    titleText: titleText,
    titleCategoryLabelText: titleCategoryLabelText,
  }}
  bind:isFullScreen
>
  {#snippet PageWrapperContent()}
    <BaseGrid
      {rows}
      paramColumnDefs={columnDefs(
        trailingSlash === "always"
          ? page.url.pathname
          : `${page.url.pathname}/`,
        getMaxParamsLength(rows, (row: EventRow) => row.eventInputs),
        {
          chainName: data.targetChain.name,
          projectName: data.targetProject.name,
          versionName: data.targetVersion.name,
          contractName: titleText,
        },
      )}
      hasMultipleTabs={false}
      exportFilePrefix="events"
      bind:isFullScreen
    />
  {/snippet}
</PageWrapper>
