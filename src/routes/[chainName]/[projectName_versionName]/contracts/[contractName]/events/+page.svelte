<script lang="ts">
  import { page } from "$app/stores";
  import PageWrapper from "$lib/PageWrapper/PageWrapper.svelte";
  import BaseGrid from "$lib/base/BaseGrid/BaseGrid.svelte";
  import type { Contract } from "@constants/chains/types";
  import { trailingSlash } from "@routes/+layout";
  import type { LoadEventsData } from "./+page";
  import { columnDefs } from "./columnDefs";
  import { gridRows, type EventRow } from "./gridRows";

  interface Props {
    data: LoadEventsData;
  }

  let { data }: Props = $props();

  let titleText: Contract["name"] = $derived(data.targetContract.name);

  const titleCategoryLabelText: string = "Events";

  let rows: EventRow[] = $derived(gridRows(data.targetEventAbiFragments));

  const maxLengthOfEventInputsParams = (): number => {
    let maxIndex: number = 0;
    rows.forEach((row: EventRow) => {
      if (row.eventInputs.length > maxIndex) {
        maxIndex = row.eventInputs.length;
      }
    });
    return maxIndex;
  };
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
          ? $page.url.pathname
          : `${$page.url.pathname}/`,
        maxLengthOfEventInputsParams(),
        {
          chainName: data.targetChain.name,
          projectName: data.targetProject.name,
          versionName: data.targetVersion.name,
          contractName: titleText,
        },
      )}
      hasMultipulTabs={false}
      exportFilePrefix="events"
      bind:isFullScreen
    />
  {/snippet}
</PageWrapper>
