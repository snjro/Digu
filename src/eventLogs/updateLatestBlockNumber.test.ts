import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { FetchRequest, makeError } from "ethers";
import { startUpdateLatestBlockNumber } from "./updateLatestBlockNumber";
import {
  getAndUpdateLatestBlockNumber,
  type NodeProvider,
} from "@utils/utilsEthers";
import { startAbortingInChain } from "@db/dbEventLogsDataHandlersSyncStatus";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { ChainName } from "@constants/chains/types";
import type { SyncStatusesChain } from "@db/dbTypes";

vi.mock("@utils/utilsEthers", async (importOriginal) => {
  const original = await importOriginal<typeof import("@utils/utilsEthers")>();
  return { ...original, getAndUpdateLatestBlockNumber: vi.fn() };
});
vi.mock("@db/dbEventLogsDataHandlersSyncStatus");

const chainName: ChainName = TARGET_CHAINS[0].name;
const blockIntervalMs: number = 1000;
const tryCount: number = 2;
const nodeProvider = {} as NodeProvider;

describe("startUpdateLatestBlockNumber", () => {
  // Set by a test that leaves the updates running.
  let stopUpdates: (() => void) | undefined;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(getAndUpdateLatestBlockNumber).mockResolvedValue(1);
    storeRpcSettings.updateState(chainName, { blockIntervalMs, tryCount });
    storeSyncStatus.update((state: SyncStatusesChain) => {
      state[chainName].isSyncing = true;
      return state;
    });
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
    await vi.advanceTimersByTimeAsync((tryCount + 3) * blockIntervalMs);

    expect(getAndUpdateLatestBlockNumber).toHaveBeenCalledTimes(tryCount + 1);
    expect(startAbortingInChain).toHaveBeenCalledExactlyOnceWith(chainName);
  });

  test("should not abort when a request fails after it is stopped", async () => {
    storeRpcSettings.updateState(chainName, { tryCount: 0 });
    let failRequest: () => void = () => {};
    vi.mocked(getAndUpdateLatestBlockNumber)
      .mockResolvedValueOnce(1)
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            failRequest = () => reject(new Error("destroyed"));
          }),
      );

    const stop = await startUpdateLatestBlockNumber(chainName, nodeProvider);
    await vi.advanceTimersByTimeAsync(blockIntervalMs);
    // Like destroying the provider while a request is in flight.
    stop();
    failRequest();
    await vi.advanceTimersByTimeAsync(blockIntervalMs);

    expect(startAbortingInChain).not.toHaveBeenCalled();
  });

  test("should log an error when aborting fails", async () => {
    vi.mocked(getAndUpdateLatestBlockNumber).mockRejectedValue(
      new Error("RPC error"),
    );
    vi.mocked(startAbortingInChain).mockRejectedValueOnce(
      new Error("DB error"),
    );
    const { customLogger } = await import("@utils/logger");
    const spyError = vi.spyOn(customLogger, "error");

    await startUpdateLatestBlockNumber(chainName, nodeProvider);
    await vi.advanceTimersByTimeAsync((tryCount + 3) * blockIntervalMs);

    expect(startAbortingInChain).toHaveBeenCalledOnce();
    expect(spyError).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: "Failed to start aborting." }),
    );
  });

  test("should not log the provider, which has the RPC URL", async () => {
    const { customLogger } = await import("@utils/logger");
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
    const { customLogger } = await import("@utils/logger");
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
