<script lang="ts" context="module">
  export type EventLogType = "hex" | "text";
</script>

<script lang="ts">
  import BaseGrid from "$lib/base/BaseGrid/BaseGrid.svelte";
  import type { ColumnDef } from "$lib/base/BaseGrid/types";
  import type { EventAbiFragment } from "@constants/chains/types";
  import type { AbiFragmentIdentifier, ConvertedEventLog } from "@db/dbTypes";
  import { columnDefs, getHexEventLogColumnDefs } from "./columnDefs";
  import { gridRows } from "./gridRows";

  export let targetEventIdentifier: AbiFragmentIdentifier;
  export let targetEventAbiFragment: EventAbiFragment;
  export let eventLogType: EventLogType;
  export let isFullScreen: boolean;

  let rows: ConvertedEventLog[] | undefined = undefined;
  $: gridRows(targetEventIdentifier).then(
    (convertedEventLogs: ConvertedEventLog[]) => {
      rows = convertedEventLogs;
    },
  );
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
  let eventLogColumnDefs: ColumnDef[];
  $: eventLogColumnDefs =
    eventLogType === "hex"
      ? getHexEventLogColumnDefs(targetEventAbiFragment)
      : columnDefs(targetEventAbiFragment, getEachArgsMaxLengths(rows));
</script>

<BaseGrid
  paramColumnDefs={eventLogColumnDefs}
  {rows}
  exportFilePrefix={`eventLogs(${eventLogType})`}
  hasMultipulTabs={true}
  bind:isFullScreen
/>
