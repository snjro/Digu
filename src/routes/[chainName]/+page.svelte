<script lang="ts">
  import type { LoadChainData } from "./+page";
  import PageWrapper from "$lib/PageWrapper/PageWrapper.svelte";
  import ChainOverview from "./ChainOverview.svelte";

  interface Props {
    data: LoadChainData;
  }

  let { data }: Props = $props();

  const titleCategoryLabelText: string = "Chain";
</script>

<PageWrapper
  titleProps={{
    titleText: data.targetChain.fullName,
    titleCategoryLabelText: titleCategoryLabelText,
  }}
>
  {#snippet PageWrapperContent()}
    <ChainOverview targetChain={data.targetChain}></ChainOverview>
  {/snippet}
</PageWrapper>
