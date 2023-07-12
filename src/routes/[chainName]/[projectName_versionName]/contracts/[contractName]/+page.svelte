<script lang="ts">
  import type { LoadContractData } from "./+page";
  import ContractOverview from "./ContractOverview.svelte";
  import BaseTab from "$lib/base/BaseTab.svelte";
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";

  export let data: LoadContractData;

  let selectedTab: "Overview" | "ABI" = "Overview";
  const titleCategoryLabelText: string = "Contract";
  let titleText: string;
  $: titleText = data.targetContract.name;
</script>

<BasePageContainer {titleText} {titleCategoryLabelText}>
  <BaseTab
    tabValues={["Overview", "ABI"]}
    bind:selectedTab
    groupName="contractInfo"
  >
    <ContractOverview
      targetChain={data.targetChain}
      targetProject={data.targetProject}
      targetVersion={data.targetVersion}
      targetContract={data.targetContract}
      hidden={selectedTab !== "Overview"}
    />
    <AbiJsonViewer
      targetAbi={data.targetContract.contractInterface}
      abiFormatType="json"
      {titleCategoryLabelText}
      {titleText}
      hidden={selectedTab !== "ABI"}
    />
  </BaseTab>
</BasePageContainer>
