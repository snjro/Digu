<script lang="ts">
  import { page } from "$app/state";
  import PageWrapper from "$lib/PageWrapper/PageWrapper.svelte";
  import BaseGrid from "$lib/grid/BaseGrid.svelte";
  import type { Contract } from "@constants/chains/types";
  import { trailingSlash } from "@routes/+layout";
  import type { LoadFunctionsData } from "./+page";
  import { columnDefs } from "./columnDefs";
  import { gridRows } from "./gridRows";
  import type { FunctionRow } from "$lib/gridColumnDefs/rowTypes";
  import { getMaxParamsLength } from "../../maxParamsLength";

  interface Props {
    data: LoadFunctionsData;
  }

  let { data }: Props = $props();

  let titleText: Contract["name"] = $derived(data.targetContract.name);

  const titleCategoryLabelText: string = "Functions";

  let rows: FunctionRow[] = $derived(gridRows(data.targetFunctionAbiFragments));

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
        getMaxParamsLength(rows, (row: FunctionRow) => row.functionInputs),
        getMaxParamsLength(rows, (row: FunctionRow) => row.functionOutputs),
      )}
      exportFilePrefix={"functions"}
      hasMultipleTabs={false}
      bind:isFullScreen
    />
  {/snippet}
</PageWrapper>
