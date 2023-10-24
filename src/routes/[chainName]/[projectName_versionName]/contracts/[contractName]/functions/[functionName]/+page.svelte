<script lang="ts">
  import type { TabsDefinitionFunction } from "$lib/PageWrapper/PageWrapper.svelte";
  import PageWrapper, {
    TAB_VALUES_FUNCTION,
  } from "$lib/PageWrapper/PageWrapper.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";
  import type { LoadFunction } from "./+page";
  import FunctionOverview from "./FunctionOverview.svelte";

  export let data: LoadFunction;

  // let selectedTabValue: SelectedTabValueFunction = "Overview";
  let tabsDefinition: TabsDefinitionFunction = {
    selected: "Overview",
    values: TAB_VALUES_FUNCTION,
    groupName: "tabGroupFunction",
  };

  const titleCategoryLabelText: string = "Function";
  $: titleText = data.targetFunctionAbiFragment.name!;

  let isFullScreen = false;
</script>

<PageWrapper
  titleProps={{
    titleText: titleText,
    titleCategoryLabelText: titleCategoryLabelText,
  }}
  bind:tabsDefinition
  bind:isFullScreen
>
  <svelte:fragment slot="PageWrapperContent">
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
  </svelte:fragment>
</PageWrapper>
