<script lang="ts">
  import { page } from "$app/stores";
  import BaseGrid from "$lib/base/BaseGrid/BaseGrid.svelte";
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import type { Contract } from "@constants/chains/types";
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
</script>

<BasePageContainer {titleText} {titleCategoryLabelText}>
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
