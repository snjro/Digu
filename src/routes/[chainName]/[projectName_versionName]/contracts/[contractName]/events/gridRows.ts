import type { EventAbiFragment } from "@constants/chains/types";
import type { EventRow } from "$lib/gridColumnDefs/rowTypes";

export const gridRows = (
  targetEventAbiFragments: EventAbiFragment[],
): EventRow[] => {
  const eventRows: EventRow[] = [];
  for (const eventAbiFragment of targetEventAbiFragments) {
    const eventRow: EventRow = {
      eventName: eventAbiFragment.name,
      eventAnonymous: eventAbiFragment.anonymous,
      eventTopicHash: eventAbiFragment.topicHash,
      eventInputs: eventAbiFragment.inputs,
    };
    eventRows.push(eventRow);
  }
  return eventRows;
};
