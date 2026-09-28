import { describe, expect, test } from "vitest";
import type { Contract, EventAbiFragment } from "@constants/chains/types";
import {
  getUnfetchedLogsMessage,
  MESSAGE_ANONYMOUS_EVENT_LOGS,
  MESSAGE_UNSYNCED_CONTRACT_EVENT_LOGS,
} from "./unfetchedLogsMessage";

function contract(names: string[]): Contract {
  return { events: { names } } as unknown as Contract;
}
function event(name: string, anonymous: boolean): EventAbiFragment {
  return { name, anonymous } as EventAbiFragment;
}

describe("getUnfetchedLogsMessage", () => {
  test.each([
    [
      "a synced event",
      contract(["Transfer"]),
      event("Transfer", false),
      undefined,
    ],
    [
      "an anonymous event",
      contract(["Transfer"]),
      event("Anonymous", true),
      MESSAGE_ANONYMOUS_EVENT_LOGS,
    ],
    [
      'an event of a contract with "syncEvents": false',
      contract([]),
      event("Transfer", false),
      MESSAGE_UNSYNCED_CONTRACT_EVENT_LOGS,
    ],
  ])("%s -> %s", (_, targetContract, targetEventAbiFragment, expected) => {
    expect(
      getUnfetchedLogsMessage(targetContract, targetEventAbiFragment),
    ).toBe(expected);
  });
});
