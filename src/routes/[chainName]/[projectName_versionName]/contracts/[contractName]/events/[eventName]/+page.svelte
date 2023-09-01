<script lang="ts">
  import PageWrapper, {
    TAB_VALUES_EVENT,
    type TabsDefinitionEvent,
  } from "$lib/PageWrapper/PageWrapper.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";
  import type { LoadEventLogs } from "./+page";
  import EventLogs from "./EventLogs.svelte";
  import EventOverview from "./EventOverview.svelte";
  export let data: LoadEventLogs;

  let tabsDefinition: TabsDefinitionEvent = {
    selected: "Overview",
    values: TAB_VALUES_EVENT,
    groupName: "tabGroupEvent",
  };
  const titleCategoryLabelText: string = "Event";

  $: titleText = data.targetEventAbiFragment.name;

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
      <EventOverview
        targetChain={data.targetChain}
        targetProject={data.targetProject}
        targetVersion={data.targetVersion}
        targetContract={data.targetContract}
        targetEventAbiFragment={data.targetEventAbiFragment}
      />
    {:else if tabsDefinition.selected === "Event Logs (text)"}
      <EventLogs
        targetEventIdentifier={data.targetEventIdentifier}
        targetEventAbiFragment={data.targetEventAbiFragment}
        eventLogType="text"
        bind:isFullScreen
      />
    {:else if tabsDefinition.selected === "Event Logs (hex)"}
      <EventLogs
        targetEventIdentifier={data.targetEventIdentifier}
        targetEventAbiFragment={data.targetEventAbiFragment}
        eventLogType="hex"
        bind:isFullScreen
      />
    {:else if tabsDefinition.selected === "ABI"}
      <AbiJsonViewer
        targetAbi={data.targetEventAbiFragment}
        abiFormatType="json"
        fragment
        bind:isFullScreen
      />
    {/if}
  </svelte:fragment>
</PageWrapper>
