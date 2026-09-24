<script lang="ts">
  import { page } from "$app/stores";
  import PageWrapper from "$lib/PageWrapper/PageWrapper.svelte";
  import BaseGrid from "$lib/base/BaseGrid/BaseGrid.svelte";
  import type { Contract } from "@constants/chains/types";
  import { trailingSlash } from "@routes/+layout";
  import type { LoadFunctionsData } from "./+page";
  import { columnDefs } from "./columnDefs";
  import { gridRows, type FunctionRow } from "./gridRows";

  interface Props {
    data: LoadFunctionsData;
  }

  let { data }: Props = $props();

  let titleText: Contract["name"] = $derived(data.targetContract.name);

  const titleCategoryLabelText: string = "Functions";

  let rows: FunctionRow[] = $derived(gridRows(data.targetFunctionAbiFragments));

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
        maxLengthOfFunctionInputsParams(),
        maxLengthOfFunctionOutputsParams(),
      )}
      exportFilePrefix={"functions"}
      hasMultipulTabs={false}
      bind:isFullScreen
    />
  {/snippet}
</PageWrapper>
