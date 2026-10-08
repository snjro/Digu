import { describe, expect, test } from "vitest";
import type { ChainActivity } from "#eventLogs/chainActivity.js";
import { NO_DATA } from "#utils/utilsConstants.js";
import { getShownSyncStoppedReason, getSyncPanelStateText } from "./syncPanel";

describe("getShownSyncStoppedReason", () => {
  test.each<ChainActivity>(["free", "smallImport", "largeImport", "resetting"])(
    "shows the reason while the sync is stopped, also when %s",
    (activity) => {
      expect(getShownSyncStoppedReason(activity, "stopped", "RPC_ERRORS")).toBe(
        "RPC_ERRORS",
      );
      expect(
        getShownSyncStoppedReason(activity, "stopped", undefined),
      ).toBeUndefined();
      for (const syncStateText of ["syncing", "stopping", NO_DATA] as const) {
        expect(
          getShownSyncStoppedReason(
            activity,
            syncStateText,
            "UNEXPECTED_ERROR",
          ),
        ).toBeUndefined();
      }
    },
  );

  test.each<ChainActivity>(["syncing", "stopping", "otherTab"])(
    "does not show it when %s, even while it starts or ends",
    (activity) => {
      expect(
        getShownSyncStoppedReason(activity, "stopped", "RPC_ERRORS"),
      ).toBeUndefined();
    },
  );
});

describe("getSyncPanelStateText", () => {
  test("has one text for each state", () => {
    expect(getSyncPanelStateText("free", "stopped", undefined)).toEqual({
      text: "Stopped.",
      isError: false,
    });
    expect(getSyncPanelStateText("syncing", "syncing", undefined)).toEqual({
      text: "Syncing.",
      isError: false,
    });
    expect(getSyncPanelStateText("stopping", "stopping", undefined)).toEqual({
      text: "Stopping.",
      isError: false,
    });
    expect(getSyncPanelStateText("free", NO_DATA, undefined)).toBeUndefined();
  });

  test("says stopped while the sync of this tab starts or ends", () => {
    expect(getSyncPanelStateText("syncing", "stopped", undefined)).toEqual({
      text: "Stopped.",
      isError: false,
    });
  });

  test("tells another tab first", () => {
    for (const syncStateText of ["stopped", "syncing", NO_DATA] as const) {
      expect(
        getSyncPanelStateText("otherTab", syncStateText, undefined),
      ).toEqual({
        text: "Syncing in another tab.",
        isError: false,
      });
    }
  });

  test("uses the texts of the RPC input for the reasons", () => {
    expect(getSyncPanelStateText("free", "stopped", "RPC_ERRORS")).toEqual({
      text: "Sync stopped: RPC errors. Try another RPC.",
      isError: true,
    });
    expect(
      getSyncPanelStateText("free", "stopped", "UNEXPECTED_ERROR"),
    ).toEqual({ text: "Sync stopped: unexpected error.", isError: true });
  });
});
