<script lang="ts">
  import PageWrapper from "$lib/PageWrapper/PageWrapper.svelte";
  import type { LoadVersionData } from "./+page";
  import VersionOverview from "./VersionOverview.svelte";
  import { getProjectVersionNameForLabel } from "./projectVersionNameHelper";

  interface Props {
    data: LoadVersionData;
  }

  let { data }: Props = $props();

  const titleCategoryLabelText: string = "Version";

  let titleText: string = $derived(
    getProjectVersionNameForLabel(
      data.targetProject.name,
      data.targetVersion.name,
    ),
  );
</script>

<PageWrapper
  titleProps={{
    titleText: titleText,
    titleCategoryLabelText: titleCategoryLabelText,
  }}
>
  <svelte:fragment slot="PageWrapperContent">
    <VersionOverview
      targetChain={data.targetChain}
      targetProject={data.targetProject}
      targetVersion={data.targetVersion}
    />
  </svelte:fragment>
</PageWrapper>
