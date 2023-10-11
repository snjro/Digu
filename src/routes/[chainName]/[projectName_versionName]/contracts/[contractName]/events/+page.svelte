<script lang="ts">
  import { page } from "$app/stores";
  import PageWrapper from "$lib/PageWrapper/PageWrapper.svelte";
  import BaseGrid from "$lib/base/BaseGrid/BaseGrid.svelte";
  import type { Contract } from "@constants/chains/types";
  import { trailingSlash } from "@routes/+layout";
  import type { LoadEventsData } from "./+page";
  import { columnDefs } from "./columnDefs";
  import { gridRows, type EventRow } from "./gridRows";

  export let data: LoadEventsData;

  let titleText: Contract["name"];
  $: titleText = data.targetContract.name;

  const titleCategoryLabelText: string = "Events";

  let rows: EventRow[] = [];
  $: rows = gridRows(data.targetEventAbiFragments);

  const maxLengthOfEventInputsParams = (): number => {
    let maxIndex: number = 0;
    rows.forEach((row: EventRow) => {
      if (row.eventInputs.length > maxIndex) {
        maxIndex = row.eventInputs.length;
      }
    });
    return maxIndex;
  };
  let isFullScreen = false;
</script>

<PageWrapper
  titleProps={{
    titleText: titleText,
    titleCategoryLabelText: titleCategoryLabelText,
  }}
  bind:isFullScreen
>
  <svelte:fragment slot="PageWrapperContent">
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
  </svelte:fragment>
</PageWrapper>
