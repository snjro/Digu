<script lang="ts" context="module">
  export const tabValuesForFunction = ["Overview", "ABI Fragment"] as const;
  export type SelectedTabValueForFunction =
    (typeof tabValuesForFunction)[number];
</script>

<script lang="ts">
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import type { LoadFunction } from "./+page";
  import FunctionOverview from "./FunctionOverview.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";

  export let data: LoadFunction;

  let selectedTabValue: SelectedTabValueForFunction = "Overview";
  const titleCategoryLabelText: string = "Function";
  $: titleText = data.targetFunctionAbiFragment.name!;
</script>

<BasePageContainer
  {titleText}
  {titleCategoryLabelText}
  tabValues={tabValuesForFunction}
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
    hidden={selectedTabValue !== "ABI Fragment"}
    fragment
  />
</BasePageContainer>
