<script lang="ts">
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import type { LoadVersionData } from "./+page";
  import VersionOverview from "./VersionOverview.svelte";
  import { getProjectVersionNameForLabel } from "./projectVersionNameHelper";

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
