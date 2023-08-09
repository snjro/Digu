<script lang="ts" context="module">
  export type EventLogType = "hex" | "text";
</script>

<script lang="ts">
  // import { afterNavigate } from "$app/navigation";

  import BaseGrid from "$lib/base/BaseGrid/BaseGrid.svelte";
  import type { ColumnDef } from "$lib/base/BaseGrid/types";
  import { columnDefs, getHexEventLogColumnDefs } from "./columnDefs";
  import type { EventAbiFragment } from "@constants/chains/types";
  import type { AbiFragmentIdentifier, ConvertedEventLog } from "@db/dbTypes";
  import { gridRows } from "./gridRows";
  export let targetEventIdentifier: AbiFragmentIdentifier;
  export let targetEventAbiFragment: EventAbiFragment;
  export let titleCategoryLabelTextForFullScreen: string;
  export let eventLogType: EventLogType;
  export let hidden: boolean;

  let rows: ConvertedEventLog[] = [];
  // let eachArgsMaxLengths: number[] = [];
  $: gridRows(targetEventIdentifier).then(
    (convertedEventLogs: ConvertedEventLog[]) => {
      rows = convertedEventLogs;
      // eachArgsMaxLengths = getEachArgsMaxLengths(rows);
    }
  );
  function getEachArgsMaxLengths(
    convertedEventLogs: ConvertedEventLog[]
  ): number[] {
    let maxLengths: number[] = [];
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
    return maxLengths;
  }
  let eventLogColumnDefs: ColumnDef[];
  $: eventLogColumnDefs =
    eventLogType === "hex"
      ? getHexEventLogColumnDefs(targetEventAbiFragment)
      : columnDefs(targetEventAbiFragment, getEachArgsMaxLengths(rows));
</script>

<BaseGrid
  {rows}
  paramColumnDefs={eventLogColumnDefs}
  titleText={targetEventAbiFragment.name}
  {titleCategoryLabelTextForFullScreen}
  {hidden}
  exportFilePrefix={`eventLogs(${eventLogType})`}
/>
