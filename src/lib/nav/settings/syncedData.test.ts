import { describe, expect, test } from "vitest";
import type { SyncStatusChain } from "@db/dbTypes";
import { NO_DATA } from "@utils/utilsConstants";
import {
  countSyncedLogs,
  getImportResultLine,
  getResetConfirmationTexts,
  getResetDisabledReason,
  getResetResultLines,
  getResetSnackBar,
  type ResetConditions,
} from "./syncedData";

const contract = (counts: number[]) => ({
  events: Object.fromEntries(
    counts.map((count, index) => [`E${index}`, { recordCount: count }]),
  ),
});

describe("countSyncedLogs", () => {
  test("adds up the logs of every event of the chain", () => {
    const chain = {
      subSyncStatuses: {
        p1: {
          subSyncStatuses: {
            v1: { subSyncStatuses: { A: contract([1, 2]), B: contract([3]) } },
            v2: { subSyncStatuses: { C: contract([4]) } },
          },
        },
        p2: { subSyncStatuses: { v1: { subSyncStatuses: {} } } },
      },
    } as unknown as SyncStatusChain;
    expect(countSyncedLogs(chain)).toBe(10);
  });
});

describe("getResetDisabledReason", () => {
  const free: ResetConditions = {
    syncStateText: "stopped",
    isSyncingInOtherTab: false,
    isImporting: false,
    isResetting: false,
  };

  test("can reset a chain that is not synced now", () => {
    expect(getResetDisabledReason(free)).toBeUndefined();
    expect(
      getResetDisabledReason({ ...free, syncStateText: NO_DATA }),
    ).toBeUndefined();
  });

  test("says why it cannot reset now", () => {
    expect(getResetDisabledReason({ ...free, syncStateText: "syncing" })).toBe(
      "Stop the sync first.",
    );
    expect(getResetDisabledReason({ ...free, syncStateText: "stopping" })).toBe(
      "Wait until the sync stops.",
    );
    expect(getResetDisabledReason({ ...free, isSyncingInOtherTab: true })).toBe(
      "The chain is synced in another tab.",
    );
    expect(getResetDisabledReason({ ...free, isImporting: true })).toBe(
      "Wait until the logs published with this site are imported.",
    );
    expect(getResetDisabledReason({ ...free, isResetting: true })).toBe(
      "Resetting…",
    );
  });
});

describe("getResetConfirmationTexts", () => {
  test("says what is deleted and kept, and where the logs come from next", () => {
    const on = getResetConfirmationTexts("Polygon Mainnet", "1,234", true);
    expect(on[0]).toBe(
      "This deletes the 1,234 event logs of Polygon Mainnet and their block times saved in this browser, and the sync of every contract starts again from its creation block.",
    );
    expect(on[1]).toBe(
      "Your settings are kept: the RPC, the warp sync and the contracts to sync.",
    );
    expect(on[2]).toMatch(/^The logs published with this site are imported/);
    expect(getResetConfirmationTexts("Ethereum", "0", false)[2]).toBe(
      "The next sync fetches every log again from your RPC.",
    );
  });
});

describe("getResetResultLines", () => {
  test("says how many logs were deleted and what comes next", () => {
    expect(
      getResetResultLines(
        {
          result: "reset",
          deletedLogCount: 4064,
          warpSyncImport: Promise.resolve(),
        },
        "Polygon Mainnet",
      ),
    ).toEqual([
      { text: "Deleted 4,064 event logs of Polygon Mainnet.", isError: false },
      {
        text: "Importing the logs published with this site…",
        isError: false,
      },
    ]);
    expect(
      getResetResultLines(
        { result: "reset", deletedLogCount: 7 },
        "Ethereum Mainnet",
      ),
    ).toEqual([
      { text: "Deleted 7 event logs of Ethereum Mainnet.", isError: false },
      {
        text: "The next sync fetches every log again from your RPC.",
        isError: false,
      },
    ]);
  });

  test("says when nothing or not everything was deleted", () => {
    expect(
      getResetResultLines({ result: "busy", deletedLogCount: 0 }, "Ethereum"),
    ).toEqual([
      {
        text: "The chain is synced now, so nothing was deleted. Stop the sync first.",
        isError: true,
      },
    ]);
    expect(
      getResetResultLines({ result: "failed", deletedLogCount: 0 }, "Ethereum"),
    ).toEqual([
      {
        text: "Reset failed. Some logs may be left. Try again.",
        isError: true,
      },
    ]);
  });
});

describe("getImportResultLine", () => {
  test("tells how the import of the warp sync ended", () => {
    expect(
      getImportResultLine({ status: "imported", toBlock: 24_000_000 }, "4,064"),
    ).toEqual({
      text: "Imported 4,064 logs up to block 24,000,000.",
      isError: false,
    });
    expect(getImportResultLine({ status: "failed" }, "0")).toEqual({
      text: "Could not import the logs published with this site. The next sync tries again, or fetches them from your RPC.",
      isError: true,
    });
    expect(getImportResultLine({ status: "none" }, "0").text).toBe(
      "This site has no event logs of this chain to import. The next sync fetches every log again from your RPC.",
    );
    // Another tab took the lock first.
    expect(getImportResultLine({ status: "idle" }, "0").text).toBe(
      "The logs published with this site are imported the next time the chain is opened or synced.",
    );
  });
});

describe("getResetSnackBar", () => {
  test("shows only the failures, since the dialog shows the result", () => {
    expect(getResetSnackBar("reset")).toBeUndefined();
    expect(getResetSnackBar("busy")).toMatchObject({
      visible: true,
      text: "The chain is synced now. Stop the sync first.",
      iconProps: { colorCategory: "error" },
    });
    expect(getResetSnackBar("failed")?.text).toBe("Reset failed. Try again.");
  });
});
