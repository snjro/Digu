<script lang="ts">
  import type { TabsDefinitionFunction } from "$lib/PageWrapper/PageWrapper.svelte";
  import PageWrapper, {
    TAB_VALUES_FUNCTION,
  } from "$lib/PageWrapper/PageWrapper.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";
  import type { LoadFunction } from "./+page";
  import FunctionOverview from "./FunctionOverview.svelte";

  interface Props {
    data: LoadFunction;
  }

  let { data }: Props = $props();

  // let selectedTabValue: SelectedTabValueFunction = "Overview";
  let tabsDefinition: TabsDefinitionFunction = $state({
    selected: "Overview",
    values: TAB_VALUES_FUNCTION,
    groupName: "tabGroupFunction",
  });

  const titleCategoryLabelText: string = "Function";
  let titleText = $derived(data.targetFunctionAbiFragment.name!);

  let isFullScreen = $state(false);
</script>

<PageWrapper
  titleProps={{
    titleText: titleText,
    titleCategoryLabelText: titleCategoryLabelText,
  }}
  bind:tabsDefinition
  bind:isFullScreen
>
  {#snippet PageWrapperContent()}
    {#if tabsDefinition.selected === "Overview"}
      <FunctionOverview
        targetChain={data.targetChain}
        targetProject={data.targetProject}
        targetVersion={data.targetVersion}
        targetContract={data.targetContract}
        targetFunctionAbiFragment={data.targetFunctionAbiFragment}
      />
    {:else if tabsDefinition.selected === "ABI"}
      <AbiJsonViewer
        targetAbi={data.targetFunctionAbiFragment}
        fragment
        bind:isFullScreen
      />
    {/if}
  {/snippet}
</PageWrapper>
