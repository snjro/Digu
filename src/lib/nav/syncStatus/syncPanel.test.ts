import { describe, expect, test } from "vitest";
import { NO_DATA } from "#utils/utilsConstants.js";
import { getShownSyncStoppedReason, getSyncPanelStateText } from "./syncPanel";

describe("getShownSyncStoppedReason", () => {
  test("shows the reason only while the sync is stopped here", () => {
    expect(getShownSyncStoppedReason("stopped", false, "RPC_ERRORS")).toBe(
      "RPC_ERRORS",
    );
    expect(getShownSyncStoppedReason("stopped", false, undefined)).toBe(
      undefined,
    );
    expect(
      getShownSyncStoppedReason("stopped", true, "RPC_ERRORS"),
    ).toBeUndefined();
    for (const syncStateText of ["syncing", "stopping", NO_DATA] as const) {
      expect(
        getShownSyncStoppedReason(syncStateText, false, "UNEXPECTED_ERROR"),
      ).toBeUndefined();
    }
  });
});

describe("getSyncPanelStateText", () => {
  test("has one text for each state", () => {
    expect(getSyncPanelStateText("stopped", false, undefined)).toEqual({
      text: "Stopped.",
      isError: false,
    });
    expect(getSyncPanelStateText("syncing", false, undefined)).toEqual({
      text: "Syncing.",
      isError: false,
    });
    expect(getSyncPanelStateText("stopping", false, undefined)).toEqual({
      text: "Stopping.",
      isError: false,
    });
    expect(getSyncPanelStateText(NO_DATA, false, undefined)).toBeUndefined();
  });

  test("tells another tab first", () => {
    for (const syncStateText of ["stopped", "syncing", NO_DATA] as const) {
      expect(getSyncPanelStateText(syncStateText, true, undefined)).toEqual({
        text: "Syncing in another tab.",
        isError: false,
      });
    }
  });

  test("uses the texts of the RPC input for the reasons", () => {
    expect(getSyncPanelStateText("stopped", false, "RPC_ERRORS")).toEqual({
      text: "Sync stopped: RPC errors. Try another RPC.",
      isError: true,
    });
    expect(getSyncPanelStateText("stopped", false, "UNEXPECTED_ERROR")).toEqual(
      { text: "Sync stopped: unexpected error.", isError: true },
    );
  });
});
