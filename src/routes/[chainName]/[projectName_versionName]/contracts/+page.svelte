<script lang="ts">
  import { page } from "$app/state";
  import PageWrapper from "$lib/PageWrapper/PageWrapper.svelte";
  import BaseGrid from "$lib/base/BaseGrid/BaseGrid.svelte";
  import { trailingSlash } from "@routes/+layout";
  import type { LoadVersionData } from "../+page";
  import { getProjectVersionNameForLabelFromUrl } from "../projectVersionNameHelper";
  import { columnDefs } from "./columnDefs";
  import { gridRows, type ContractRow } from "./gridRows";
  import { getMaxParamsLength } from "./maxParamsLength";

  interface Props {
    data: LoadVersionData;
  }

  let { data }: Props = $props();

  const projectVersionName: string = $derived(
    page.params.projectName_versionName!,
  );
  const titleCategoryLabelText: string = "Contracts";

  let rows: ContractRow[] = $derived(gridRows(data.targetVersion.contracts));

  let isFullScreen = $state(false);
</script>

<PageWrapper
  titleProps={{
    titleText: getProjectVersionNameForLabelFromUrl(projectVersionName),
    titleCategoryLabelText: titleCategoryLabelText,
  }}
  bind:isFullScreen
>
  {#snippet PageWrapperContent()}
    <BaseGrid
      {rows}
      paramColumnDefs={columnDefs(
        data.targetChain,
        data.targetProject,
        data.targetVersion,
        trailingSlash === "always"
          ? page.url.pathname
          : `${page.url.pathname}/`,

        getMaxParamsLength(
          rows,
          (row: ContractRow) => row.contractConstructorInputs,
        ),
      )}
      hasMultipulTabs={false}
      exportFilePrefix="contracts"
      bind:isFullScreen
    />
  {/snippet}
</PageWrapper>
