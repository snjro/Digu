<script lang="ts">
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import type { LoadEventLogs } from "./+page";
  import EventLogs from "./EventLogs.svelte";
  import EventOverview from "./EventOverview.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";
  import {
    TAB_VALUES_EVENT,
    type SelectedTabValueEvent,
  } from "$lib/base/BasePage/BasePageContainerContent.svelte";
  export let data: LoadEventLogs;

  let selectedTabValue: SelectedTabValueEvent = "Overview";
  const titleCategoryLabelText: string = "Event";
  $: eventName = data.targetEventAbiFragment.name!;
</script>

<BasePageContainer
  titleText={eventName}
  {titleCategoryLabelText}
  tabValues={TAB_VALUES_EVENT}
  bind:selectedTabValue
  tabGroupName="eventLogsInfo"
>
  <EventOverview
    targetChain={data.targetChain}
    targetProject={data.targetProject}
    targetVersion={data.targetVersion}
    targetContract={data.targetContract}
    targetEventAbiFragment={data.targetEventAbiFragment}
    hidden={selectedTabValue !== "Overview"}
  />
  <EventLogs
    targetEventIdentifier={data.targetEventIdentifier}
    targetEventAbiFragment={data.targetEventAbiFragment}
    hidden={selectedTabValue !== "Event Logs (text)"}
    {titleCategoryLabelText}
    eventLogType="text"
  />
  <EventLogs
    targetEventIdentifier={data.targetEventIdentifier}
    targetEventAbiFragment={data.targetEventAbiFragment}
    hidden={selectedTabValue !== "Event Logs (hex)"}
    {titleCategoryLabelText}
    eventLogType="hex"
  />
  <AbiJsonViewer
    targetAbi={data.targetEventAbiFragment}
    abiFormatType="json"
    {titleCategoryLabelText}
    titleText={eventName}
    hidden={selectedTabValue !== "ABI"}
    fragment
  />
</BasePageContainer>
