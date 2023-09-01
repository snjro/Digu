<script lang="ts">
  import type { TabsDefinitionContract } from "$lib/PageWrapper/PageWrapper.svelte";
  import PageWrapper, {
    TAB_VALUES_CONTRACT,
  } from "$lib/PageWrapper/PageWrapper.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";
  import type { LoadContractData } from "./+page";
  import ContractOverview from "./ContractOverview.svelte";

  export let data: LoadContractData;

  let tabsDefinition: TabsDefinitionContract = {
    selected: "Overview",
    values: TAB_VALUES_CONTRACT,
    groupName: "tabGroupContract",
  };
  const titleCategoryLabelText: string = "Contract";
  let titleText: string;
  $: titleText = data.targetContract.name;
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
      <ContractOverview
        targetChain={data.targetChain}
        targetProject={data.targetProject}
        targetVersion={data.targetVersion}
        targetContract={data.targetContract}
      />
    {:else if tabsDefinition.selected === "ABI"}
      <AbiJsonViewer
        targetAbi={data.targetContract.contractInterface}
        abiFormatType="json"
        bind:isFullScreen
      />
    {/if}
  </svelte:fragment>
</PageWrapper>
