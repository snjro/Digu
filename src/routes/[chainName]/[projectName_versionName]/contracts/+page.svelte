<script lang="ts">
  import { page } from "$app/state";
  import PageWrapper from "#lib/PageWrapper/PageWrapper.svelte";
  import BaseGrid from "#lib/grid/BaseGrid.svelte";
  import { trailingSlash } from "#routes/+layout.js";
  import type { LoadVersionData } from "../+page";
  import { getProjectVersionNameForLabelFromUrl } from "#lib/common/projectVersionNameHelper.js";
  import { columnDefs } from "./columnDefs";
  import { gridRows } from "./gridRows";
  import type { ContractRow } from "#lib/gridColumnDefs/rowTypes.js";
  import { getMaxParamsLength } from "./maxParamsLength";
  import { storeSyncStatus } from "#stores/storeSyncStatus.js";
  import { storeChainStatus } from "#stores/storeChainStatus.js";

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

  // The sync status columns read them.
  const refreshSortFilterOn = [storeSyncStatus, storeChainStatus];
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
      hasMultipleTabs={false}
      exportFilePrefix="contracts"
      {refreshSortFilterOn}
      bind:isFullScreen
    />
  {/snippet}
</PageWrapper>
