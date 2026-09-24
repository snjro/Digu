<script lang="ts" module>
  export type EventLogType = "hex" | "text";
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
  import { gridRows } from "./gridRows";

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
    } else {
      gridRows(targetEventIdentifier).then(
        (convertedEventLogs: ConvertedEventLog[]) => {
          rows = convertedEventLogs;
        },
      );
    }
  });
  function getEachArgsMaxLengths(
    convertedEventLogs: ConvertedEventLog[] | undefined,
  ): number[] {
    let maxLengths: number[] = [];
    if (convertedEventLogs) {
      for (
        let indexOfInput: number = 0;
        indexOfInput < targetEventAbiFragment.inputs.length;
        indexOfInput++
      ) {
        let maxLength: number = 0;
        for (const convertedEventLog of convertedEventLogs) {
          if (
            Array.isArray(convertedEventLog.args[indexOfInput]) &&
            convertedEventLog.args[indexOfInput].length > maxLength
          ) {
            maxLength = convertedEventLog.args[indexOfInput].length;
          } else {
            maxLength = 1;
          }
        }
        maxLengths.push(maxLength);
      }
    }
    return maxLengths;
  }
  let eventLogColumnDefs: ColumnDef[] = $derived(
    eventLogType === "hex"
      ? getHexEventLogColumnDefs(targetEventAbiFragment)
      : columnDefs(targetEventAbiFragment, getEachArgsMaxLengths(rows)),
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
