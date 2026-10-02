<script lang="ts">
  import { convertTabValueForHref } from "#lib/PageWrapper/tabs.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import CommonItemMember from "#lib/common/CommonItemMember.svelte";
  import CommonViewMoreDetailsButton from "#lib/common/CommonViewMoreDetailsButton.svelte";
  import type {
    Chain,
    Contract,
    EventAbiFragment,
    Project,
    Version,
  } from "#constants/chains/types.js";
  import {
    getEventLogEdges,
    type EventLogEdges,
  } from "#db/dbEventLogsGetEventLogEdges.js";
  import type { AbiFragmentIdentifier } from "#db/dbTypes.js";
  import { storeSyncStatus } from "#stores/storeSyncStatus.js";
  import { numberWithCommas } from "#utils/utilsCommon.js";
  import { customLogger } from "#utils/logger.js";
  import classNames from "classnames";
  import EventOverviewFetchedLogsEdge from "./EventOverviewFetchedLogsEdge.svelte";
  import { MESSAGE_ANONYMOUS_EVENT_LOGS } from "./EventLogs.svelte";
  import { applyLatestLoad } from "./latestLoad";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
    targetContract: Contract;
    targetEventAbiFragment: EventAbiFragment;
  }

  let {
    targetChain,
    targetProject,
    targetVersion,
    targetContract,
    targetEventAbiFragment,
  }: Props = $props();

  // The sync adds to it when it saves logs of this event.
  let recordCount: number | undefined = $derived(
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name]
      ?.events[targetEventAbiFragment.name]?.recordCount,
  );

  const noLogs: EventLogEdges = {
    count: 0,
    oldest: undefined,
    latest: undefined,
  };
  let edges: EventLogEdges = $state.raw(noLogs);
  $effect.pre(() => {
    // Logs of anonymous events are not fetched, so their table does not exist.
    if (targetEventAbiFragment.anonymous) {
      edges = noLogs;
      return;
    }
    // Reload when new logs are saved.
    void recordCount;
    const eventIdentifier: AbiFragmentIdentifier = {
      chainName: targetChain.name,
      projectName: targetProject.name,
      versionName: targetVersion.name,
      contractName: targetContract.name,
      abiFragmentName: targetEventAbiFragment.name,
    };
    return applyLatestLoad(
      getEventLogEdges(eventIdentifier).catch((error: unknown) => {
        // Like the table (gridRows.ts): log it and show no logs.
        customLogger.error("Get event logs.", {
          eventIdentifier: eventIdentifier,
          errorObject: error,
        });
        return noLogs;
      }),
      (loadedEdges: EventLogEdges) => {
        edges = loadedEdges;
      },
    );
  });

  const gridMain: string = classNames(
    "grid",
    "grid-cols-1 lg:grid-cols-2",
    "grid-flow-dense",
    "gap-5",
  );
</script>

{#if targetEventAbiFragment.anonymous}
  <BaseLabel
    text={MESSAGE_ANONYMOUS_EVENT_LOGS}
    italic
    textSize={sizeSettings.itemWarningMessage}
  />
{:else if edges.oldest && edges.latest}
  <CommonItemMember text="Number of Fetched Logs">
    <BaseLabel
      text={numberWithCommas(edges.count)}
      textSize={sizeSettings.itemMember}
    />
  </CommonItemMember>
  <div class={classNames(gridMain, "w-full", "h-fit")}>
    <CommonItemMember text="Latest Log">
      <EventOverviewFetchedLogsEdge edgeEventLog={edges.latest} />
    </CommonItemMember>
    <CommonItemMember text="Oldest Log">
      <EventOverviewFetchedLogsEdge edgeEventLog={edges.oldest} />
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
    textSize={sizeSettings.itemWarningMessage}
  />
{/if}
