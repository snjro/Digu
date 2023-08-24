<script lang="ts">
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import type { LoadEventLogs } from "./+page";
  import EventLogs from "./EventLogs.svelte";
  import EventOverview from "./EventOverview.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";
  import {
    TAB_VALUES_EVENT,
    type TabStateEvent,
  } from "$lib/base/BasePage/BasePageContainerContent.svelte";
  export let data: LoadEventLogs;

  let tabState: TabStateEvent = {
    selected: "Overview",
    values: TAB_VALUES_EVENT,
    groupName: "tabGroupEvent",
  };

  const titleCategoryLabelText: string = "Event";

  $: titleText = data.targetEventAbiFragment.name;
</script>

<BasePageContainer {titleText} {titleCategoryLabelText} bind:tabState>
  <EventOverview
    targetChain={data.targetChain}
    targetProject={data.targetProject}
    targetVersion={data.targetVersion}
    targetContract={data.targetContract}
    targetEventAbiFragment={data.targetEventAbiFragment}
    hidden={tabState.selected !== "Overview"}
  />
  <EventLogs
    targetEventIdentifier={data.targetEventIdentifier}
    targetEventAbiFragment={data.targetEventAbiFragment}
    hidden={tabState.selected !== "Event Logs (text)"}
    titleCategoryLabelTextForFullScreen={tabState.selected}
    eventLogType="text"
  />
  <EventLogs
    targetEventIdentifier={data.targetEventIdentifier}
    targetEventAbiFragment={data.targetEventAbiFragment}
    hidden={tabState.selected !== "Event Logs (hex)"}
    titleCategoryLabelTextForFullScreen={tabState.selected}
    eventLogType="hex"
  />
  <AbiJsonViewer
    targetAbi={data.targetEventAbiFragment}
    abiFormatType="json"
    {titleCategoryLabelText}
    {titleText}
    hidden={tabState.selected !== "ABI"}
    fragment
  />
</BasePageContainer>
