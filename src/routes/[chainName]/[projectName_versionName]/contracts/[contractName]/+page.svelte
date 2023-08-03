<script lang="ts">
  import type { LoadContractData } from "./+page";
  import ContractOverview from "./ContractOverview.svelte";
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";
  import {
    TAB_VALUES_CONTRACT,
    type TabStateContract,
  } from "$lib/base/BasePage/BasePageContainerContent.svelte";

  export let data: LoadContractData;

  // let selectedTabValue: SelectedTabValueContract = "Overview";
  let tabState: TabStateContract = {
    selected: "Overview",
    values: TAB_VALUES_CONTRACT,
    groupName: "tabGroupContract",
  };
  const titleCategoryLabelText: string = "Contract";
  let titleText: string;
  $: titleText = data.targetContract.name;
</script>

<BasePageContainer {titleText} {titleCategoryLabelText} bind:tabState>
  <ContractOverview
    targetChain={data.targetChain}
    targetProject={data.targetProject}
    targetVersion={data.targetVersion}
    targetContract={data.targetContract}
    hidden={tabState.selected !== "Overview"}
  />
  <AbiJsonViewer
    targetAbi={data.targetContract.contractInterface}
    abiFormatType="json"
    {titleCategoryLabelText}
    {titleText}
    hidden={tabState.selected !== "ABI"}
  />
</BasePageContainer>
