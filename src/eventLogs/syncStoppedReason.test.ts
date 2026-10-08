import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { FetchRequest, makeError } from "ethers";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { ChainName } from "#constants/chains/types.js";
import type { SyncStatusesChain } from "#db/dbTypes.js";
import { startAbortingInChain } from "#db/dbEventLogsDataHandlersSyncStatus.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { customLogger } from "#utils/logger.js";
import {
  abortChainWithReason,
  recordSyncStoppedReason,
} from "./syncStoppedReason";

vi.mock("#db/dbEventLogsDataHandlersSyncStatus.js");

const chainName: ChainName = TARGET_CHAINS[0].name;

function setChainAborting(isAbort: boolean): void {
  storeSyncStatus.update((state: SyncStatusesChain) => {
    state[chainName].isAbort = isAbort;
    return state;
  });
}

describe("recordSyncStoppedReason", () => {
  afterEach(() => {
    setChainAborting(false);
    storeSyncStoppedReason.clear(chainName);
  });

  test("should record the reason when the chain is not stopping", () => {
    recordSyncStoppedReason(chainName, "RPC_ERRORS");
    expect(get(storeSyncStoppedReason)[chainName]).toBe("RPC_ERRORS");
  });

  test("should keep no reason when the chain is already stopping", () => {
    setChainAborting(true);
    recordSyncStoppedReason(chainName, "RPC_ERRORS");
    expect(get(storeSyncStoppedReason)[chainName]).toBeUndefined();
  });
});

describe("abortChainWithReason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    storeSyncStoppedReason.clear(chainName);
  });

  test("should log why, record the reason and start to abort", async () => {
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});

    await abortChainWithReason(chainName, "RPC_ERRORS", "Too many errors.", {
      errorCount: "11/10",
    });

    expect(spyError).toHaveBeenCalledExactlyOnceWith("Too many errors.", {
      chainName,
      reason: "RPC_ERRORS",
      errorCount: "11/10",
    });
    expect(get(storeSyncStoppedReason)[chainName]).toBe("RPC_ERRORS");
    expect(startAbortingInChain).toHaveBeenCalledExactlyOnceWith(chainName);
  });

  test("should record the reason and start to abort when the log throws", async () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {
      throw new Error("logger error");
    });

    await abortChainWithReason(chainName, "RPC_ERRORS", "Too many errors.");

    expect(get(storeSyncStoppedReason)[chainName]).toBe("RPC_ERRORS");
    expect(startAbortingInChain).toHaveBeenCalledExactlyOnceWith(chainName);
  });

  test("should start to abort when recording the reason throws", async () => {
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    vi.spyOn(storeSyncStoppedReason, "record").mockImplementation(() => {
      throw new Error("store error");
    });

    await abortChainWithReason(chainName, "RPC_ERRORS", "Too many errors.");

    expect(spyError).toHaveBeenCalledWith(
      "Failed to record why the sync stopped.",
      expect.objectContaining({ chainName }),
    );
    expect(startAbortingInChain).toHaveBeenCalledExactlyOnceWith(chainName);
  });

  test("should log only the code and the short message of an error of aborting", async () => {
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    vi.mocked(startAbortingInChain).mockRejectedValueOnce(
      makeError("server response 401 Unauthorized", "SERVER_ERROR", {
        request: new FetchRequest("https://rpc.example/secret-key"),
        info: { requestUrl: "https://rpc.example/secret-key" },
      }),
    );

    await abortChainWithReason(chainName, "RPC_ERRORS", "Too many errors.");

    expect(spyError).toHaveBeenCalledWith("Failed to start aborting.", {
      chainName,
      error: {
        code: "SERVER_ERROR",
        shortMessage: "server response 401 Unauthorized",
      },
    });
  });

  test("should not throw when every step and every log fails", async () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {
      throw new Error("logger error");
    });
    vi.spyOn(storeSyncStoppedReason, "record").mockImplementation(() => {
      throw new Error("store error");
    });
    vi.mocked(startAbortingInChain).mockRejectedValueOnce(
      new Error("DB error"),
    );

    await expect(
      abortChainWithReason(chainName, "RPC_ERRORS", "Too many errors."),
    ).resolves.toBeUndefined();
    expect(startAbortingInChain).toHaveBeenCalledOnce();
  });
});
