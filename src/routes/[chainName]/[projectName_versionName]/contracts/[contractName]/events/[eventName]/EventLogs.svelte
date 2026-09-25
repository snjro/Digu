<script lang="ts" module>
  export const MESSAGE_ANONYMOUS_EVENT_LOGS: string =
    "Logs of anonymous events are not fetched.";
  // While the sync saves logs, reload the rows at most once in this time.
  export const EVENT_LOGS_RELOAD_INTERVAL: number = 3000;
</script>

<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseGrid from "$lib/grid/BaseGrid.svelte";
  import type { ColumnDef } from "$lib/grid/types";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { EventAbiFragment } from "@constants/chains/types";
  import type { AbiFragmentIdentifier, ConvertedEventLog } from "@db/dbTypes";
  import { columnDefs, getHexEventLogColumnDefs } from "./columnDefs";
  import type { EventLogType } from "$lib/contracts/eventLogType";
  import { gridRows } from "./gridRows";
  import { createThrottledLoad } from "./latestLoad";
  import { getEachArgsMaxLengths } from "../../../maxParamsLength";
  import { storeSyncStatus } from "@stores/storeSyncStatus";

  interface Props {
    targetEventIdentifier: AbiFragmentIdentifier;
    targetEventAbiFragment: EventAbiFragment;
    eventLogType: EventLogType;
    isFullScreen: boolean;
  }

  let {
    targetEventIdentifier,
    targetEventAbiFragment,
    eventLogType,
    isFullScreen = $bindable(),
  }: Props = $props();

  // The sync adds to it when it saves logs of this event.
  let recordCount: number | undefined = $derived(
    $storeSyncStatus[targetEventIdentifier.chainName].subSyncStatuses[
      targetEventIdentifier.projectName
    ].subSyncStatuses[targetEventIdentifier.versionName].subSyncStatuses[
      targetEventIdentifier.contractName
    ]?.events[targetEventIdentifier.abiFragmentName]?.recordCount,
  );

  let rows: ConvertedEventLog[] | undefined = $state.raw(undefined);
  // Logs of anonymous events are not fetched, so their table does not exist.
  $effect.pre(() => {
    if (targetEventAbiFragment.anonymous) {
      rows = [];
      return;
    }
    const eventIdentifier: AbiFragmentIdentifier = targetEventIdentifier;
    const throttledLoad = createThrottledLoad(
      (signal: AbortSignal) => gridRows(eventIdentifier, signal),
      (convertedEventLogs: ConvertedEventLog[]) => {
        rows = convertedEventLogs;
      },
      EVENT_LOGS_RELOAD_INTERVAL,
    );
    // Reload when new logs are saved.
    $effect.pre(() => {
      void recordCount;
      throttledLoad.request();
    });
    return throttledLoad.dispose;
  });
  // Keep the same array while the lengths do not change, so new rows do not
  // rebuild the columns.
  let previousArgsMaxLengths: number[] = [];
  let eachArgsMaxLengths: number[] = $derived.by(() => {
    const lengths: number[] = getEachArgsMaxLengths(
      rows,
      targetEventAbiFragment.inputs.length,
    );
    if (lengths.join(",") !== previousArgsMaxLengths.join(",")) {
      previousArgsMaxLengths = lengths;
    }
    return previousArgsMaxLengths;
  });
  let eventLogColumnDefs: ColumnDef[] = $derived(
    eventLogType === "hex"
      ? getHexEventLogColumnDefs(targetEventAbiFragment)
      : columnDefs(targetEventAbiFragment, eachArgsMaxLengths),
  );
</script>

{#if targetEventAbiFragment.anonymous}
  <BaseLabel
    text={MESSAGE_ANONYMOUS_EVENT_LOGS}
    italic
    textSize={sizeSettings.itemWarnningMessage}
  />
{:else}
  <BaseGrid
    paramColumnDefs={eventLogColumnDefs}
    {rows}
    exportFilePrefix={`eventLogs(${eventLogType})`}
    hasMultipulTabs={true}
    bind:isFullScreen
  />
{/if}
