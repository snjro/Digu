<script lang="ts">
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import type { LoadFunction } from "./+page";
  import FunctionOverview from "./FunctionOverview.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";

  export let data: LoadFunction;

  type SelectetTabsForEventLogs = "Overview" | "ABI Fragment";
  let selectedTab: SelectetTabsForEventLogs = "Overview";
  const titleCategoryLabelText: string = "Function";
  $: titleText = data.targetFunctionAbiFragment.name!;
</script>

<BasePageContainer
  {titleText}
  {titleCategoryLabelText}
  tabValues={["Overview", "ABI Fragment"]}
  bind:selectedTab
  tabGroupName="eventLogsInfo"
>
  <FunctionOverview
    targetChain={data.targetChain}
    targetProject={data.targetProject}
    targetVersion={data.targetVersion}
    targetContract={data.targetContract}
    targetFunctionAbiFragment={data.targetFunctionAbiFragment}
    hidden={selectedTab !== "Overview"}
  />
  <AbiJsonViewer
    targetAbi={data.targetFunctionAbiFragment}
    abiFormatType="json"
    {titleCategoryLabelText}
    {titleText}
    hidden={selectedTab !== "ABI Fragment"}
    fragment
  />
</BasePageContainer>
