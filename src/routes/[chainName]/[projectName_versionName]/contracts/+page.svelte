<script lang="ts">
  import { page } from "$app/state";
  import PageWrapper from "$lib/PageWrapper/PageWrapper.svelte";
  import BaseGrid from "$lib/base/BaseGrid/BaseGrid.svelte";
  import type { ProjectName, VersionName } from "@constants/chains/types";
  import { trailingSlash } from "@routes/+layout";
  import type { LoadVersionData } from "../+page";
  import {
    getProjectVersionNameForLabel,
    getSplitProjectVersionName,
  } from "../projectVersionNameHelper";
  import { columnDefs } from "./columnDefs";
  import { gridRows, type ContractRow } from "./gridRows";

  interface Props {
    data: LoadVersionData;
  }

  let { data }: Props = $props();

  const projectVersionName: string = $derived(
    page.params.projectName_versionName!,
  );
  const titleText = (): string => {
    const splitProjectVersionName: {
      projectName: ProjectName;
      versionName: VersionName;
    } = getSplitProjectVersionName(projectVersionName);
    return getProjectVersionNameForLabel(
      splitProjectVersionName.projectName,
      splitProjectVersionName.versionName,
    );
  };
  const titleCategoryLabelText: string = "Contracts";

  let rows: ContractRow[] = $derived(gridRows(data.targetVersion.contracts));

  const maxLengthOfConstructorInputsParams = (): number => {
    let maxIndex: number = 0;
    rows.forEach((row: ContractRow) => {
      if (row.contractConstructorInputs.length > maxIndex) {
        maxIndex = row.contractConstructorInputs.length;
      }
    });
    return maxIndex;
  };
  let isFullScreen = $state(false);
</script>

<PageWrapper
  titleProps={{
    titleText: titleText(),
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

        maxLengthOfConstructorInputsParams(),
      )}
      hasMultipulTabs={false}
      exportFilePrefix="contracts"
      bind:isFullScreen
    />
  {/snippet}
</PageWrapper>
