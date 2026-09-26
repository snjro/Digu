<script lang="ts">
  import { convertTabValueForHref } from "$lib/PageWrapper/tabs";
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
  import { dbWorkerFuncGetConvertedEventLogs } from "@db/db.worker.func.getConvertedEventLogs";
  import type { AbiFragmentIdentifier, ConvertedEventLog } from "@db/dbTypes";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { numberWithCommas } from "@utils/utilsCommon";
  import { customLogger } from "@utils/logger";
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

  let convertedEventLogs: ConvertedEventLog[] = $state.raw([]);
  $effect.pre(() => {
    // Logs of anonymous events are not fetched, so their table does not exist.
    if (targetEventAbiFragment.anonymous) {
      convertedEventLogs = [];
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
      dbWorkerFuncGetConvertedEventLogs(eventIdentifier).catch(
        (error: unknown) => {
          // Like the table (gridRows.ts): log it and show no logs.
          customLogger.error("Get event logs.", {
            eventIdentifier: eventIdentifier,
            errorObject: error,
          });
          return [];
        },
      ),
      (logs: ConvertedEventLog[]) => {
        convertedEventLogs = logs;
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
{:else if convertedEventLogs.length > 0}
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
    textSize={sizeSettings.itemWarningMessage}
  />
{/if}
