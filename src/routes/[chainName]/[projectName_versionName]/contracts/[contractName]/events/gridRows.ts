import type { EventAbiFragment } from "@constants/chains/types";

export type EventRow = {
  eventName: EventAbiFragment["name"];
  eventAnonymous: EventAbiFragment["anonymous"];
  eventInputs: EventAbiFragment["inputs"];
  eventTopicHash: EventAbiFragment["topicHash"];
};
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
