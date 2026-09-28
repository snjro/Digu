import type { Contract, EventAbiFragment } from "@constants/chains/types";

export const MESSAGE_ANONYMOUS_EVENT_LOGS: string =
  "Logs of anonymous events are not fetched.";
export const MESSAGE_UNSYNCED_CONTRACT_EVENT_LOGS: string =
  "Logs of this contract are not fetched.";

// undefined when the logs of the event are fetched. The logs that are not
// fetched have no table.
export function getUnfetchedLogsMessage(
  targetContract: Contract,
  targetEventAbiFragment: EventAbiFragment,
): string | undefined {
  if (targetEventAbiFragment.anonymous) {
    return MESSAGE_ANONYMOUS_EVENT_LOGS;
  }
  if (!targetContract.events.names.includes(targetEventAbiFragment.name)) {
    return MESSAGE_UNSYNCED_CONTRACT_EVENT_LOGS;
  }
  return undefined;
}
