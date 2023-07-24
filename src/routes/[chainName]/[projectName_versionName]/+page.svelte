<script lang="ts">
  import type { LoadVersionData } from "./+page";
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import { getProjectVersionNameForLabel } from "./projectVersionNameHelper";
  import VersionOverview from "./VersionOverview.svelte";

  export let data: LoadVersionData;

  const titleCategoryLabelText: string = "Version";

  let titleText: string;
  $: titleText = getProjectVersionNameForLabel(
    data.targetProject.name,
    data.targetVersion.name
  );
</script>

<BasePageContainer {titleText} {titleCategoryLabelText}>
  <VersionOverview
    targetChain={data.targetChain}
    targetProject={data.targetProject}
    targetVersion={data.targetVersion}
  />
</BasePageContainer>
