<script lang="ts" module>
  export const MESSAGE_ANONYMOUS_EVENT_LOGS: string =
    "Logs of anonymous events are not fetched.";
</script>

<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseGrid from "$lib/base/BaseGrid/BaseGrid.svelte";
  import type { ColumnDef } from "$lib/base/BaseGrid/types";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { EventAbiFragment } from "@constants/chains/types";
  import type { AbiFragmentIdentifier, ConvertedEventLog } from "@db/dbTypes";
  import { columnDefs, getHexEventLogColumnDefs } from "./columnDefs";
  import type { EventLogType } from "./eventLogType";
  import { gridRows } from "./gridRows";
  import { applyLatestLoad } from "./latestLoad";
  import { getEachArgsMaxLengths } from "../../../maxParamsLength";

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

  let rows: ConvertedEventLog[] | undefined = $state.raw(undefined);
  // Logs of anonymous events are not fetched, so their table does not exist.
  $effect.pre(() => {
    if (targetEventAbiFragment.anonymous) {
      rows = [];
      return;
    }
    return applyLatestLoad(
      gridRows(targetEventIdentifier),
      (convertedEventLogs: ConvertedEventLog[]) => {
        rows = convertedEventLogs;
      },
    );
  });
  let eventLogColumnDefs: ColumnDef[] = $derived(
    eventLogType === "hex"
      ? getHexEventLogColumnDefs(targetEventAbiFragment)
      : columnDefs(
          targetEventAbiFragment,
          getEachArgsMaxLengths(rows, targetEventAbiFragment.inputs.length),
        ),
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
