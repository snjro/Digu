import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { FetchRequest, makeError } from "ethers";
import {
  LATEST_BLOCK_REQUEST_LIMIT_IN_INTERVALS,
  startUpdateLatestBlockNumber,
} from "./updateLatestBlockNumber";
import { TRY_COUNT } from "./eventLogsContract";
import {
  getAndUpdateLatestBlockNumber,
  type NodeProvider,
} from "#utils/utilsEthers.js";
import { startAbortingInChain } from "#db/dbEventLogsDataHandlersSyncStatus.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain, ChainName } from "#constants/chains/types.js";
import type { SyncStatusesChain } from "#db/dbTypes.js";
import { get } from "svelte/store";

vi.mock("#utils/utilsEthers.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("#utils/utilsEthers.js")>();
  return { ...original, getAndUpdateLatestBlockNumber: vi.fn() };
});
vi.mock("#db/dbEventLogsDataHandlersSyncStatus.js");

const targetChain: Chain = TARGET_CHAINS[0];
const chainName: ChainName = targetChain.name;
const blockIntervalMs: number = targetChain.blockIntervalMs;
const nodeProvider = {} as NodeProvider;

describe("startUpdateLatestBlockNumber", () => {
  // Set by a test that leaves the updates running.
  let stopUpdates: (() => void) | undefined;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(getAndUpdateLatestBlockNumber).mockResolvedValue(1);
    storeSyncStatus.update((state: SyncStatusesChain) => {
      state[chainName].isSyncing = true;
      state[chainName].isAbort = false;
      return state;
    });
    storeSyncStoppedReason.clear(chainName);
  });
  afterEach(() => {
    stopUpdates?.();
    stopUpdates = undefined;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("should stop requesting the latest block number when stopped", async () => {
    const stop = await startUpdateLatestBlockNumber(chainName, nodeProvider);
    await vi.advanceTimersByTimeAsync(blockIntervalMs);
    expect(getAndUpdateLatestBlockNumber).toHaveBeenCalledTimes(2);

    stop();
    await vi.advanceTimersByTimeAsync(3 * blockIntervalMs);
    expect(getAndUpdateLatestBlockNumber).toHaveBeenCalledTimes(2);
  });

  test("should not request the latest block number again until the last request ends", async () => {
    let answerRequest: () => void = () => {};
    vi.mocked(getAndUpdateLatestBlockNumber)
      .mockResolvedValueOnce(1)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            answerRequest = () => resolve(2);
          }),
      );

    stopUpdates = await startUpdateLatestBlockNumber(chainName, nodeProvider);
    await vi.advanceTimersByTimeAsync(3 * blockIntervalMs);
    expect(getAndUpdateLatestBlockNumber).toHaveBeenCalledTimes(2);

    answerRequest();
    await vi.advanceTimersByTimeAsync(blockIntervalMs);
    expect(getAndUpdateLatestBlockNumber).toHaveBeenCalledTimes(3);
  });

  test("should count a request that takes too long as failed, and go on", async () => {
    vi.mocked(getAndUpdateLatestBlockNumber)
      .mockResolvedValueOnce(1)
      .mockReturnValueOnce(new Promise(() => {}));
    const { customLogger } = await import("#utils/logger.js");
    const spyWarn = vi.spyOn(customLogger, "warn").mockImplementation(() => {});

    stopUpdates = await startUpdateLatestBlockNumber(chainName, nodeProvider);
    await vi.advanceTimersByTimeAsync(blockIntervalMs);
    expect(getAndUpdateLatestBlockNumber).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(
      LATEST_BLOCK_REQUEST_LIMIT_IN_INTERVALS * blockIntervalMs,
    );
    expect(spyWarn).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ errorCount: `1/${TRY_COUNT}` }),
    );
    await vi.advanceTimersByTimeAsync(blockIntervalMs);
    expect(getAndUpdateLatestBlockNumber).toHaveBeenCalledTimes(3);
  });

  test("should go on requesting the latest block number after an unexpected error", async () => {
    vi.mocked(getAndUpdateLatestBlockNumber)
      .mockResolvedValueOnce(1)
      .mockRejectedValueOnce(new Error("RPC error"));
    const { customLogger } = await import("#utils/logger.js");
    // An error outside the try of the request.
    vi.spyOn(customLogger, "warn").mockImplementationOnce(() => {
      throw new Error("logger error");
    });
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});

    stopUpdates = await startUpdateLatestBlockNumber(chainName, nodeProvider);
    await vi.advanceTimersByTimeAsync(2 * blockIntervalMs);

    expect(spyError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        errorMessage: "Failed to update the latest block number.",
      }),
    );
    expect(getAndUpdateLatestBlockNumber).toHaveBeenCalledTimes(3);
  });

  test("should stop once when it is stopped after it stopped itself", async () => {
    vi.mocked(getAndUpdateLatestBlockNumber).mockRejectedValue(
      new Error("RPC error"),
    );
    const { customLogger } = await import("#utils/logger.js");
    const spyStart = vi.spyOn(customLogger, "start");

    const stop = await startUpdateLatestBlockNumber(chainName, nodeProvider);
    await vi.advanceTimersByTimeAsync((TRY_COUNT + 3) * blockIntervalMs);
    stop();

    expect(
      spyStart.mock.calls.filter(([log]) => String(log).startsWith("Stop ")),
    ).toHaveLength(1);
  });

  test("should stop requesting the latest block number when the chain is not syncing", async () => {
    await startUpdateLatestBlockNumber(chainName, nodeProvider);
    storeSyncStatus.update((state: SyncStatusesChain) => {
      state[chainName].isSyncing = false;
      return state;
    });

    await vi.advanceTimersByTimeAsync(3 * blockIntervalMs);
    expect(getAndUpdateLatestBlockNumber).toHaveBeenCalledOnce();
  });

  test("should abort the chain once when the errors exceed Try Count", async () => {
    vi.mocked(getAndUpdateLatestBlockNumber).mockRejectedValue(
      new Error("RPC error"),
    );

    await startUpdateLatestBlockNumber(chainName, nodeProvider);
    await vi.advanceTimersByTimeAsync((TRY_COUNT + 3) * blockIntervalMs);

    expect(getAndUpdateLatestBlockNumber).toHaveBeenCalledTimes(TRY_COUNT + 1);
    expect(startAbortingInChain).toHaveBeenCalledExactlyOnceWith(chainName);
    expect(get(storeSyncStoppedReason)[chainName]).toBe("RPC_ERRORS");
  });

  test("should keep no reason when the errors exceed Try Count after the user stopped", async () => {
    vi.mocked(getAndUpdateLatestBlockNumber).mockRejectedValue(
      new Error("RPC error"),
    );
    storeSyncStatus.update((state: SyncStatusesChain) => {
      state[chainName].isAbort = true;
      return state;
    });

    await startUpdateLatestBlockNumber(chainName, nodeProvider);
    await vi.advanceTimersByTimeAsync((TRY_COUNT + 3) * blockIntervalMs);

    expect(startAbortingInChain).toHaveBeenCalledOnce();
    expect(get(storeSyncStoppedReason)[chainName]).toBeUndefined();
  });

  test("should not abort when a request fails after it is stopped", async () => {
    let failRequest: () => void = () => {};
    // Errors up to Try Count, so that one more error would abort.
    for (let i = 0; i < TRY_COUNT; i++) {
      vi.mocked(getAndUpdateLatestBlockNumber).mockRejectedValueOnce(
        new Error("RPC error"),
      );
    }
    vi.mocked(getAndUpdateLatestBlockNumber).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          failRequest = () => reject(new Error("destroyed"));
        }),
    );

    const stop = await startUpdateLatestBlockNumber(chainName, nodeProvider);
    await vi.advanceTimersByTimeAsync(TRY_COUNT * blockIntervalMs);
    // Like destroying the provider while a request is in flight.
    stop();
    failRequest();
    await vi.advanceTimersByTimeAsync(blockIntervalMs);

    expect(startAbortingInChain).not.toHaveBeenCalled();
  });

  test("should not warn when a request fails after it is stopped", async () => {
    let failRequest: () => void = () => {};
    vi.mocked(getAndUpdateLatestBlockNumber)
      .mockResolvedValueOnce(1)
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            failRequest = () =>
              reject(new Error("provider destroyed; cancelled request"));
          }),
      );
    const { customLogger } = await import("#utils/logger.js");
    const spyWarn = vi.spyOn(customLogger, "warn");

    const stop = await startUpdateLatestBlockNumber(chainName, nodeProvider);
    await vi.advanceTimersByTimeAsync(blockIntervalMs);
    stop();
    failRequest();
    await vi.advanceTimersByTimeAsync(blockIntervalMs);

    expect(spyWarn).not.toHaveBeenCalled();
  });

  test("should warn when a request fails while it is not stopped", async () => {
    vi.mocked(getAndUpdateLatestBlockNumber)
      .mockResolvedValueOnce(1)
      .mockRejectedValueOnce(new Error("RPC error"));
    const { customLogger } = await import("#utils/logger.js");
    const spyWarn = vi.spyOn(customLogger, "warn");

    stopUpdates = await startUpdateLatestBlockNumber(chainName, nodeProvider);
    await vi.advanceTimersByTimeAsync(blockIntervalMs);

    expect(spyWarn).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ errorCount: `1/${TRY_COUNT}` }),
    );
  });

  test("should log an error when aborting fails", async () => {
    vi.mocked(getAndUpdateLatestBlockNumber).mockRejectedValue(
      new Error("RPC error"),
    );
    vi.mocked(startAbortingInChain).mockRejectedValueOnce(
      new Error("DB error"),
    );
    const { customLogger } = await import("#utils/logger.js");
    const spyError = vi.spyOn(customLogger, "error");

    await startUpdateLatestBlockNumber(chainName, nodeProvider);
    await vi.advanceTimersByTimeAsync((TRY_COUNT + 3) * blockIntervalMs);

    expect(startAbortingInChain).toHaveBeenCalledOnce();
    expect(spyError).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: "Failed to start aborting." }),
    );
  });

  test("should not log the provider, which has the RPC URL", async () => {
    const { customLogger } = await import("#utils/logger.js");
    const spyStart = vi.spyOn(customLogger, "start");

    stopUpdates = await startUpdateLatestBlockNumber(chainName, nodeProvider);

    expect(spyStart).toHaveBeenCalledWith(expect.any(String), {
      chainName: chainName,
    });
  });

  test("should log only the code and the short message of an ethers error", async () => {
    vi.mocked(getAndUpdateLatestBlockNumber).mockRejectedValueOnce(
      makeError("server response 401 Unauthorized", "SERVER_ERROR", {
        request: new FetchRequest("https://rpc.example/secret-key"),
        info: { requestUrl: "https://rpc.example/secret-key" },
      }),
    );
    const { customLogger } = await import("#utils/logger.js");
    const spyWarn = vi.spyOn(customLogger, "warn");

    stopUpdates = await startUpdateLatestBlockNumber(chainName, nodeProvider);

    expect(spyWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        error: {
          code: "SERVER_ERROR",
          shortMessage: "server response 401 Unauthorized",
        },
      }),
    );
  });
});
