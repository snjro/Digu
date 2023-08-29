<script lang="ts">
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import {
    TAB_VALUES_FUNCTION,
    type TabStateFunction,
  } from "$lib/base/BasePage/BasePageContainerContent.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";
  import type { LoadFunction } from "./+page";
  import FunctionOverview from "./FunctionOverview.svelte";

  export let data: LoadFunction;

  // let selectedTabValue: SelectedTabValueFunction = "Overview";
  let tabState: TabStateFunction = {
    selected: "Overview",
    values: TAB_VALUES_FUNCTION,
    groupName: "tabGroupFunction",
  };

  const titleCategoryLabelText: string = "Function";
  $: titleText = data.targetFunctionAbiFragment.name!;
</script>

<BasePageContainer {titleText} {titleCategoryLabelText} bind:tabState>
  <FunctionOverview
    targetChain={data.targetChain}
    targetProject={data.targetProject}
    targetVersion={data.targetVersion}
    targetContract={data.targetContract}
    targetFunctionAbiFragment={data.targetFunctionAbiFragment}
    hidden={tabState.selected !== "Overview"}
  />
  <AbiJsonViewer
    targetAbi={data.targetFunctionAbiFragment}
    abiFormatType="json"
    {titleCategoryLabelText}
    {titleText}
    hidden={tabState.selected !== "ABI"}
    fragment
  />
</BasePageContainer>
