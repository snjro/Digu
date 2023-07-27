<script lang="ts">
  import type { LoadContractData } from "./+page";
  import ContractOverview from "./ContractOverview.svelte";
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";

  export let data: LoadContractData;

  let selectedTabValue: "Overview" | "ABI" = "Overview";
  const titleCategoryLabelText: string = "Contract";
  let titleText: string;
  $: titleText = data.targetContract.name;
</script>

<BasePageContainer
  {titleText}
  {titleCategoryLabelText}
  tabValues={["Overview", "ABI"]}
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
