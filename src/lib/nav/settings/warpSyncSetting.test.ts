import { afterEach, describe, expect, test, vi } from "vitest";
import type { Chain } from "#constants/chains/types.js";
import { updateDbItemRpcSettings } from "#db/dbSettings.js";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "#stores/storeNoDb.js";
import { customLogger } from "#utils/logger.js";
import {
  forgetWarpSyncConfirmation,
  startWarpSync,
} from "#warpSync/warpSync.js";
import { setWarpSyncStopController } from "#warpSync/warpSyncState.js";
import { get } from "svelte/store";
import { getWarpSyncHelperText, updateWarpSync } from "./warpSyncSetting";

vi.mock("#db/dbSettings.js", () => ({ updateDbItemRpcSettings: vi.fn() }));
vi.mock("#warpSync/warpSync.js", () => ({
  startWarpSync: vi.fn(async () => {}),
  confirmWarpSync: vi.fn(async () => {}),
  forgetWarpSyncConfirmation: vi.fn(),
}));

const matic = { name: "matic" } as Chain;

describe("updateWarpSync", () => {
  afterEach(() => {
    vi.mocked(updateDbItemRpcSettings).mockReset();
    vi.mocked(startWarpSync).mockClear();
    storeNoDbSnackBar.set({ ...storeNoDbSnackBarInitialValue });
    vi.restoreAllMocks();
  });

  test("saves it, and imports the snapshot when it is turned on", async () => {
    expect(await updateWarpSync(matic, true)).toBe(true);
    expect(updateDbItemRpcSettings).toHaveBeenCalledWith(
      "matic",
      "warpSync",
      true,
    );
    expect(startWarpSync).toHaveBeenCalledWith(matic);
  });
  test("asks again for a large import when it is turned on", async () => {
    await updateWarpSync(matic, true);
    expect(forgetWarpSyncConfirmation).toHaveBeenCalledWith("matic");
  });
  test("does not import, and stops the import of this tab, when it is turned off", async () => {
    const controller = new AbortController();
    setWarpSyncStopController("matic", controller);
    expect(await updateWarpSync(matic, false)).toBe(true);
    expect(startWarpSync).not.toHaveBeenCalled();
    expect(controller.signal.aborted).toBe(true);
    setWarpSyncStopController("matic", undefined);
  });
  test("returns false and shows a snackbar when the save fails", async () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    vi.mocked(updateDbItemRpcSettings).mockRejectedValueOnce(new Error("db"));
    expect(await updateWarpSync(matic, true)).toBe(false);
    expect(get(storeNoDbSnackBar).visible).toBe(true);
    expect(startWarpSync).not.toHaveBeenCalled();
  });
});

describe("getWarpSyncHelperText", () => {
  test("says up to which block and when, once imported", () => {
    expect(
      getWarpSyncHelperText(true, {
        status: "imported",
        toBlock: 83_000_000,
        createdAt: "2026-09-28T01:02:03.000Z",
      }),
    ).toBe(
      "Imports the event logs published with this site, up to block 83,000,000 (2026-09-28). Turn it off to fetch logs only from your RPC.",
    );
  });
  test.each([
    ["checking", "Checking the event logs published with this site…"],
    ["importing", "Importing the event logs published with this site…"],
    [
      "failed",
      "Could not import the event logs published with this site. Turn it off to fetch logs only from your RPC.",
    ],
    ["none", "This site has no event logs of this chain to import."],
    [
      "confirm",
      "Waiting for your answer to import the event logs published with this site.",
    ],
    [
      "unsupported",
      "This browser cannot import the event logs published with this site: the logs are fetched only from your RPC.",
    ],
    [
      "idle",
      "Imports the event logs published with this site when the chain is opened. Turn it off to fetch logs only from your RPC.",
    ],
  ] as const)("%s", (status, text) => {
    expect(getWarpSyncHelperText(true, { status })).toBe(text);
  });
  test("says that the logs come only from the RPC when it is off", () => {
    expect(getWarpSyncHelperText(false, { status: "imported" })).toBe(
      "Off: the logs are fetched only from your RPC.",
    );
  });
});

describe("after Not now or a stop", () => {
  const pending = {
    logCount: 1_200_000,
    snapshotLogCount: 2_328_259,
    bytes: 101_000_000,
    rawBytes: 0,
    files: 60,
  };
  test.each(["declined", "stopped"] as const)(
    "%s says what is left, and can import",
    (status) => {
      expect(getWarpSyncHelperText(true, { status, pending })).toBe(
        "Not imported yet: 1,200,000 logs (101 MB) are left to import.",
      );
    },
  );
  test("says when Import could not start, and without the numbers", () => {
    expect(
      getWarpSyncHelperText(true, { status: "declined", pending, busy: true }),
    ).toBe(
      "Could not import now: the chain is synced. Choose Import when the sync stops. Not imported yet: 1,200,000 logs (101 MB) are left to import.",
    );
    expect(getWarpSyncHelperText(true, { status: "stopped" })).toBe(
      "Not imported yet.",
    );
  });
});
