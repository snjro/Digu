<script lang="ts">
  import { page } from "$app/stores";
  import BaseGrid from "$lib/base/BaseGrid/BaseGrid.svelte";
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import BaseTab from "$lib/base/BaseTab.svelte";
  import type { LoadFunctionsData } from "./+page";
  import { columnDefs } from "./columnDefs";
  import { gridRows, type FunctionRow } from "./gridRows";

  export let data: LoadFunctionsData;

  let selectedTab: undefined = undefined;
  const titleText = (): string => {
    return data.targetContract.name;
  };
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
</script>

<BasePageContainer
  titleText={data.targetContract.name}
  {titleCategoryLabelText}
>
  <BaseTab bind:selectedTab groupName="contractFunctionsInfo">
    <BaseGrid
      {rows}
      paramColumnDefs={columnDefs(
        $page.url.pathname,
        maxLengthOfFunctionInputsParams(),
        maxLengthOfFunctionOutputsParams()
      )}
      titleText={titleText()}
      {titleCategoryLabelText}
      hidden={false}
    />
  </BaseTab>
</BasePageContainer>
