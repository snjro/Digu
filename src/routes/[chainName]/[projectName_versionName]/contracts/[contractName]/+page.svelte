<script lang="ts">
  import type { LoadContractData } from "./+page";
  import ContractOverview from "./ContractOverview.svelte";
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";
  import {
    TAB_VALUES_CONTRACT,
    type SelectedTabValueContract,
  } from "$lib/base/BasePage/BasePageContainerContent.svelte";

  export let data: LoadContractData;

  let selectedTabValue: SelectedTabValueContract = "Overview";
  const titleCategoryLabelText: string = "Contract";
  let titleText: string;
  $: titleText = data.targetContract.name;
</script>

<BasePageContainer
  {titleText}
  {titleCategoryLabelText}
  tabValues={TAB_VALUES_CONTRACT}
  bind:selectedTabValue
  tabGroupName="contractInfo"
>
  <ContractOverview
    targetChain={data.targetChain}
    targetProject={data.targetProject}
    targetVersion={data.targetVersion}
    targetContract={data.targetContract}
    hidden={selectedTabValue !== "Overview"}
  />
  <AbiJsonViewer
    targetAbi={data.targetContract.contractInterface}
    abiFormatType="json"
    {titleCategoryLabelText}
    {titleText}
    hidden={selectedTabValue !== "ABI"}
  />
</BasePageContainer>
