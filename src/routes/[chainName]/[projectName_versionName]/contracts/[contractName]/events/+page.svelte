<script lang="ts">
  import { page } from "$app/stores";
  import type { LoadEventsData } from "./+page";
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import BaseGrid from "$lib/base/BaseGrid/BaseGrid.svelte";
  import { gridRows, type EventRow } from "./gridRows";
  import { columnDefs } from "./columnDefs";
  import type { Contract } from "@constants/chains/types";

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
</script>

<BasePageContainer {titleText} {titleCategoryLabelText} isContentGrid>
  <BaseGrid
    {rows}
    paramColumnDefs={columnDefs(
      $page.url.pathname,
      maxLengthOfEventInputsParams(),
      {
        chainName: data.targetChain.name,
        projectName: data.targetProject.name,
        versionName: data.targetVersion.name,
        contractName: titleText,
      }
    )}
    {titleText}
    titleCategoryLabelTextForFullScreen={titleCategoryLabelText}
    hidden={false}
    exportFilePrefix="events"
  />
</BasePageContainer>
