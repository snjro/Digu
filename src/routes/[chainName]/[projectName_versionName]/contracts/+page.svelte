<script lang="ts">
  import { page } from "$app/stores";
  import BaseGrid from "$lib/base/BaseGrid/BaseGrid.svelte";
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import BaseTab from "$lib/base/BaseTab.svelte";
  import type { ProjectName, VersionName } from "@constants/chains/types";
  import { gridRows, type ContractRow } from "./gridRows";
  import { columnDefs } from "./columnDefs";
  import type { LoadVersionData } from "../+page";
  import {
    getProjectVersionNameForLabel,
    getSplitProjectVersionName,
  } from "../projectVersionNameHelper";

  export let data: LoadVersionData;

  const projectVersionName: string = $page.params.projectName_versionName;
  let selectedTab: undefined = undefined;
  const titleText = (): string => {
    const splitProjectVersionName: {
      projectName: ProjectName;
      versionName: VersionName;
    } = getSplitProjectVersionName(projectVersionName);
    return getProjectVersionNameForLabel(
      splitProjectVersionName.projectName,
      splitProjectVersionName.versionName
    );
  };
  const titleCategoryLabelText: string = "Contracts";

  let rows: ContractRow[] = [];
  $: rows = gridRows(data.targetVersion.contracts);

  const maxLengthOfConstructorInputsParams = (): number => {
    let maxIndex: number = 0;
    rows.forEach((row: ContractRow) => {
      if (row.contractConstructorInputs.length > maxIndex) {
        maxIndex = row.contractConstructorInputs.length;
      }
    });
    return maxIndex;
  };
</script>

<BasePageContainer titleText={titleText()} {titleCategoryLabelText}>
  <BaseTab bind:selectedTab groupName="projectVersionContractsInfo">
    <BaseGrid
      {rows}
      paramColumnDefs={columnDefs(
        data.targetChain,
        data.targetProject,
        data.targetVersion,
        $page.url.pathname,
        maxLengthOfConstructorInputsParams()
      )}
      titleText={titleText()}
      {titleCategoryLabelText}
      hidden={false}
      csvFileNameHeader="contracts"
    />
  </BaseTab>
</BasePageContainer>
