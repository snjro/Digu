<script lang="ts">
  import BasePageContainer from "$lib/base/BasePage/BasePageContainer.svelte";
  import type { LoadEventLogs } from "./+page";
  import EventLogs from "./EventLogs.svelte";
  import EventOverview from "./EventOverview.svelte";
  import AbiJsonViewer from "$lib/contracts/abiJson/AbiJsonViewer.svelte";
  export let data: LoadEventLogs;

  type SelectetTabsForEventLogs =
    | "Overview"
    | "Event Logs (Decoded)"
    | "Event Logs (Hex)"
    | "ABI Fragment";
  let selectedTab: SelectetTabsForEventLogs = "Overview";
  const titleCategoryLabelText: string = "Event";
  $: eventName = data.targetEventAbiFragment.name!;
</script>

<BasePageContainer
  titleText={eventName}
  {titleCategoryLabelText}
  tabValues={[
    "Overview",
    "Event Logs (Decoded)",
    "Event Logs (Hex)",
    "ABI Fragment",
  ]}
  bind:selectedTab
  tabGroupName="eventLogsInfo"
>
  <EventOverview
    targetChain={data.targetChain}
    targetProject={data.targetProject}
    targetVersion={data.targetVersion}
    targetContract={data.targetContract}
    targetEventAbiFragment={data.targetEventAbiFragment}
    hidden={selectedTab !== "Overview"}
  />
  <EventLogs
    targetEventIdentifier={data.targetEventIdentifier}
    targetEventAbiFragment={data.targetEventAbiFragment}
    hidden={selectedTab !== "Event Logs (Decoded)"}
    {titleCategoryLabelText}
    eventLogType="decoded"
  />
  <EventLogs
    targetEventIdentifier={data.targetEventIdentifier}
    targetEventAbiFragment={data.targetEventAbiFragment}
    hidden={selectedTab !== "Event Logs (Hex)"}
    {titleCategoryLabelText}
    eventLogType="hex"
  />
  <AbiJsonViewer
    targetAbi={data.targetEventAbiFragment}
    abiFormatType="json"
    {titleCategoryLabelText}
    titleText={eventName}
    hidden={selectedTab !== "ABI Fragment"}
    fragment
  />
</BasePageContainer>
