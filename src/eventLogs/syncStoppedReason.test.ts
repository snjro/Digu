import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import {
  LOGGABLE_ETHERS_ERROR,
  makeEthersErrorWithRpcUrl,
} from "#utils/testCommon.js";
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

  test("should log why at the level, record the reason and start to abort", async () => {
    const spyFatal = vi
      .spyOn(customLogger, "fatal")
      .mockImplementation(() => {});

    expect(
      await abortChainWithReason(chainName, "RPC_ERRORS", "Too many errors.", {
        level: "fatal",
        details: { errorCount: "11/10" },
        error: makeEthersErrorWithRpcUrl(),
      }),
    ).toEqual({ aborted: true });

    expect(spyFatal).toHaveBeenCalledExactlyOnceWith("Too many errors.", {
      chainName,
      reason: "RPC_ERRORS",
      errorCount: "11/10",
      error: LOGGABLE_ETHERS_ERROR,
    });
    expect(get(storeSyncStoppedReason)[chainName]).toBe("RPC_ERRORS");
    expect(startAbortingInChain).toHaveBeenCalledExactlyOnceWith(chainName);
  });

  test("should log an ethers error in the cause without what ethers adds", async () => {
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});

    await abortChainWithReason(chainName, "UNEXPECTED_ERROR", "Stopped.", {
      error: new Error("Failed to start aborting.", {
        cause: makeEthersErrorWithRpcUrl(),
      }),
    });

    expect(spyError).toHaveBeenCalledExactlyOnceWith("Stopped.", {
      chainName,
      reason: "UNEXPECTED_ERROR",
      error: {
        name: "Error",
        message: "Failed to start aborting.",
        cause: LOGGABLE_ETHERS_ERROR,
      },
    });
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

  test("should log the error of aborting without what ethers adds, and return it", async () => {
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    const abortError: Error = makeEthersErrorWithRpcUrl();
    vi.mocked(startAbortingInChain).mockRejectedValueOnce(abortError);

    expect(
      await abortChainWithReason(chainName, "RPC_ERRORS", "Too many errors."),
    ).toEqual({ aborted: false, error: abortError });

    expect(spyError).toHaveBeenCalledWith("Failed to start aborting.", {
      chainName,
      error: LOGGABLE_ETHERS_ERROR,
    });
  });

  test("should leave the error of aborting to the caller when asked", async () => {
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    vi.mocked(startAbortingInChain).mockRejectedValueOnce(
      new Error("DB error"),
    );

    const result = await abortChainWithReason(
      chainName,
      "RPC_ERRORS",
      "Too many errors.",
      { logAbortError: false },
    );

    expect(result.aborted).toBe(false);
    expect(spyError).toHaveBeenCalledOnce();
    expect(spyError).not.toHaveBeenCalledWith(
      "Failed to start aborting.",
      expect.anything(),
    );
  });

  test("should not throw when every step, every log and making the error loggable fail", async () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {
      throw new Error("logger error");
    });
    vi.spyOn(storeSyncStoppedReason, "record").mockImplementation(() => {
      throw new Error("store error");
    });
    // An error whose code cannot be read, as getLoggableError reads it.
    const unreadableError = Object.defineProperties(new Error("DB error"), {
      code: {
        get: () => {
          throw new Error("unreadable");
        },
      },
      shortMessage: { value: "DB error" },
    });
    vi.mocked(startAbortingInChain).mockRejectedValueOnce(unreadableError);

    await expect(
      abortChainWithReason(chainName, "RPC_ERRORS", "Too many errors.", {
        error: unreadableError,
      }),
    ).resolves.toEqual({ aborted: false, error: unreadableError });
    expect(startAbortingInChain).toHaveBeenCalledOnce();
  });
});
