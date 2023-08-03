<script lang="ts">
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import type { LoadFunction } from "./+page";
  import FunctionOverview from "./FunctionOverview.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";
  import {
    TAB_VALUES_FUNCTION,
    type SelectedTabValueFunction,
  } from "$lib/base/BasePage/BasePageContainerContent.svelte";

  export let data: LoadFunction;

  let selectedTabValue: SelectedTabValueFunction = "Overview";
  const titleCategoryLabelText: string = "Function";
  $: titleText = data.targetFunctionAbiFragment.name!;
</script>

<BasePageContainer
  {titleText}
  {titleCategoryLabelText}
  tabValues={TAB_VALUES_FUNCTION}
  bind:selectedTabValue
  tabGroupName="eventLogsInfo"
>
  <FunctionOverview
    targetChain={data.targetChain}
    targetProject={data.targetProject}
    targetVersion={data.targetVersion}
    targetContract={data.targetContract}
    targetFunctionAbiFragment={data.targetFunctionAbiFragment}
    hidden={selectedTabValue !== "Overview"}
  />
  <AbiJsonViewer
    targetAbi={data.targetFunctionAbiFragment}
    abiFormatType="json"
    {titleCategoryLabelText}
    {titleText}
    hidden={selectedTabValue !== "ABI"}
    fragment
  />
</BasePageContainer>
