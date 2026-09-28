import { afterEach, describe, expect, test, vi } from "vitest";
import type { Chain } from "@constants/chains/types";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "@stores/storeNoDb";
import { customLogger } from "@utils/logger";
import { startWarpSync } from "@warpSync/warpSync";
import { get } from "svelte/store";
import { getWarpSyncHelperText, updateWarpSync } from "./warpSyncSetting";

vi.mock("@db/dbSettings", () => ({ updateDbItemRpcSettings: vi.fn() }));
vi.mock("@warpSync/warpSync", () => ({ startWarpSync: vi.fn(async () => {}) }));

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
  test("does not import when it is turned off", async () => {
    expect(await updateWarpSync(matic, false)).toBe(true);
    expect(startWarpSync).not.toHaveBeenCalled();
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
    ["importing", "Importing the event logs published with this site…"],
    [
      "failed",
      "Could not import the event logs published with this site. Turn it off to fetch logs only from your RPC.",
    ],
    ["none", "This site has no event logs of this chain to import."],
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
