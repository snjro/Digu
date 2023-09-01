<script lang="ts">
  import { convertTabValueForHref } from "$lib/PageWrapper/PageWrapper.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import CommonViewMoreDetailsButton from "$lib/common/CommonViewMoreDetailsButton.svelte";
  import type {
    Chain,
    Contract,
    EventAbiFragment,
    Project,
    Version,
  } from "@constants/chains/types";
  import { DbEventLogs } from "@db/dbEventLogs";
  import { getEventLogTableRecords } from "@db/dbEventLogsDataHandlersEventLog";
  import type { ConvertedEventLog } from "@db/dbTypes";
  import { numberWithCommas } from "@utils/utilsCommon";
  import { getEventLogTableName } from "@utils/utlisDb";
  import classNames from "classnames";
  import EventOverviewFetchedLogsEdge from "./EventOverviewFetchedLogsEdge.svelte";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
  export let targetEventAbiFragment: EventAbiFragment;

  let convertedEventLogs: ConvertedEventLog[] = [];
  const eventLogsFetcherFromDB = async (
    targetChainName: Chain["name"],
    targetProjectName: Project["name"],
    targetVersionName: Version["name"],
    targetContractName: Contract["name"],
    targetEventAbiFragmentName: EventAbiFragment["name"],
  ): Promise<void> => {
    const dbEventLogs: DbEventLogs = new DbEventLogs({
      chainName: targetChainName,
      projectName: targetProjectName,
      versionName: targetVersionName,
    });
    const eventLogTableName: string = getEventLogTableName(
      targetContractName,
      targetEventAbiFragmentName,
    );

    convertedEventLogs = await getEventLogTableRecords(
      dbEventLogs,
      eventLogTableName,
      "asc",
    );
  };
  $: eventLogsFetcherFromDB(
    targetChain.name,
    targetProject.name,
    targetVersion.name,
    targetContract.name,
    targetEventAbiFragment.name,
  );

  const gridMain: string = classNames(
    "grid",
    "grid-cols-1 lg:grid-cols-2",
    "grid-flow-dense",
    "gap-5",
  );
</script>

{#if convertedEventLogs.length > 0}
  <CommonItemMember text="Number of Fetched Logs">
    <BaseLabel
      text={numberWithCommas(convertedEventLogs.length)}
      textSize={sizeSettings.itemMember}
    />
  </CommonItemMember>
  <div class={classNames(gridMain, "w-full", "h-fit")}>
    <CommonItemMember text="Latest Log">
      <EventOverviewFetchedLogsEdge {convertedEventLogs} edgeType="latest" />
    </CommonItemMember>
    <CommonItemMember text="Oldest Log">
      <EventOverviewFetchedLogsEdge {convertedEventLogs} edgeType="oldest" />
    </CommonItemMember>
  </div>
  <CommonViewMoreDetailsButton
    label="View all Event Logs"
    size={sizeSettings.itemViewAllButton}
    href={convertTabValueForHref("Event Logs (text)")}
  />
{:else}
  <BaseLabel
    text="No logs fetched yet."
    italic
    textSize={sizeSettings.itemWarnningMessage}
  />
{/if}
