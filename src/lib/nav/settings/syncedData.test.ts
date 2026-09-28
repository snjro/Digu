import { describe, expect, test } from "vitest";
import type { SyncStatusChain } from "@db/dbTypes";
import { NO_DATA } from "@utils/utilsConstants";
import {
  countSyncedLogs,
  getResetConfirmationTexts,
  getResetDisabledReason,
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
      "Stop the sync first.",
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

describe("getResetSnackBar", () => {
  test("tells the result", () => {
    expect(getResetSnackBar("reset", "Ethereum")).toMatchObject({
      visible: true,
      text: "The sync of Ethereum was reset.",
      iconProps: { colorCategory: "success" },
    });
    expect(getResetSnackBar("busy", "Ethereum").text).toBe(
      "The chain is synced now. Stop the sync first.",
    );
    expect(getResetSnackBar("failed", "Ethereum").text).toBe(
      "Reset failed. Try again.",
    );
  });
});
