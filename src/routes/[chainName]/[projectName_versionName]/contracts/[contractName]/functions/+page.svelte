<script lang="ts">
  import { page } from "$app/stores";
  import PageWrapper from "$lib/PageWrapper/PageWrapper.svelte";
  import BaseGrid from "$lib/base/BaseGrid/BaseGrid.svelte";
  import type { Contract } from "@constants/chains/types";
  import type { LoadFunctionsData } from "./+page";
  import { columnDefs } from "./columnDefs";
  import { gridRows, type FunctionRow } from "./gridRows";

  export let data: LoadFunctionsData;

  let titleText: Contract["name"];
  $: titleText = data.targetContract.name;

  const titleCategoryLabelText: string = "Functions";

  let rows: FunctionRow[] = [];
  $: rows = gridRows(data.targetFunctionAbiFragments);

  const maxLengthOfFunctionInputsParams = (): number => {
    let maxIndex: number = 0;
    rows.forEach((row: FunctionRow) => {
      if (row.functionInputs.length > maxIndex) {
        maxIndex = row.functionInputs.length;
      }
    });
    return maxIndex;
  };
  const maxLengthOfFunctionOutputsParams = (): number => {
    let maxIndex: number = 0;
    rows.forEach((row: FunctionRow) => {
      if (row.functionOutputs.length > maxIndex) {
        maxIndex = row.functionOutputs.length;
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
        $page.url.pathname,
        maxLengthOfFunctionInputsParams(),
        maxLengthOfFunctionOutputsParams(),
      )}
      exportFilePrefix={"functions"}
      hasMultipulTabs={false}
      bind:isFullScreen
    />
  </svelte:fragment>
</PageWrapper>
