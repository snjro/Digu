import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { FetchRequest, makeError } from "ethers";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain } from "#constants/chains/types.js";
import {
  startAbortingInChain,
  startSyncingInChain,
  stopSyncingInChain,
} from "#db/dbEventLogsDataHandlersSyncStatus.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { customLogger } from "#utils/logger.js";
import { getNodeProvider, type NodeProvider } from "#utils/utilsEthers.js";
import { fetchEventLogsContract } from "./eventLogsContract";
import { startUpdateLatestBlockNumber } from "./updateLatestBlockNumber";
import {
  importWarpSyncBeforeSync,
  waitForWarpSync,
} from "#warpSync/warpSync.js";
import { fetchEventLogs } from "./eventLogs";
import { requestSyncLock } from "./syncLock";

vi.mock("./syncLock", () => ({ requestSyncLock: vi.fn() }));
vi.mock("#warpSync/warpSync.js", () => ({
  waitForWarpSync: vi.fn(),
  importWarpSyncBeforeSync: vi.fn(),
}));
vi.mock("#db/dbEventLogsDataHandlersSyncStatus.js", () => ({
  startSyncingInChain: vi.fn(),
  startAbortingInChain: vi.fn(),
  stopSyncingInChain: vi.fn(),
}));
vi.mock("#utils/utilsEthers.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#utils/utilsEthers.js")>()),
  getNodeProvider: vi.fn(),
}));
vi.mock("./updateLatestBlockNumber", () => ({
  startUpdateLatestBlockNumber: vi.fn(),
}));
vi.mock("./eventLogsContract", () => ({
  fetchEventLogsContract: vi.fn(),
}));

const chain = { name: "matic" } as Chain;

describe("fetchEventLogs", () => {
  test("waits for the warp sync of this tab, then imports the rest under the lock before the sync starts", async () => {
    const calls: string[] = [];
    vi.mocked(waitForWarpSync).mockImplementation(async () => {
      calls.push("wait for the import of this tab");
    });
    vi.mocked(importWarpSyncBeforeSync).mockImplementation(async () => {
      calls.push("import");
    });
    vi.mocked(startSyncingInChain).mockImplementation(async () => {
      calls.push("start syncing");
    });
    vi.mocked(requestSyncLock).mockImplementation(async (chainName, start) => {
      calls.push(`lock ${chainName}`);
      await start();
      return true;
    });

    expect(await fetchEventLogs(chain)).toBe(true);
    expect(calls).toEqual([
      "wait for the import of this tab",
      "lock matic",
      "import",
      "start syncing",
    ]);
    expect(importWarpSyncBeforeSync).toHaveBeenCalledWith(chain);
    expect(startSyncingInChain).toHaveBeenCalledWith("matic");
  });
});

describe("fetchEventLogs stops the chain by itself", () => {
  const matic: Chain = TARGET_CHAINS.find((chain) => chain.name === "matic")!;
  const nodeProvider = { destroy: vi.fn() } as unknown as NodeProvider;
  let spyLogs: Record<"error" | "fail", ReturnType<typeof vi.spyOn>>;
  beforeEach(() => {
    vi.clearAllMocks();
    // Start, then sync, as the lock does.
    vi.mocked(requestSyncLock).mockImplementation(
      async (_chainName, start, sync) => {
        await start();
        await sync();
        return true;
      },
    );
    vi.mocked(getNodeProvider).mockResolvedValue(nodeProvider);
    vi.mocked(startUpdateLatestBlockNumber).mockResolvedValue(() => {});
    vi.mocked(fetchEventLogsContract).mockResolvedValue();
    spyLogs = {
      error: vi.spyOn(customLogger, "error").mockImplementation(() => {}),
      fail: vi.spyOn(customLogger, "fail").mockImplementation(() => {}),
    };
  });
  afterEach(() => {
    vi.restoreAllMocks();
    storeSyncStoppedReason.clear("matic");
  });

  test("when it cannot get a provider", async () => {
    vi.mocked(getNodeProvider).mockResolvedValue(undefined);

    await fetchEventLogs(matic);

    expect(spyLogs.fail).toHaveBeenCalledExactlyOnceWith(
      "Get provider.",
      expect.objectContaining({ chainName: "matic", reason: "RPC_ERRORS" }),
    );
    expect(get(storeSyncStoppedReason).matic).toBe("RPC_ERRORS");
    expect(startAbortingInChain).toHaveBeenCalledExactlyOnceWith("matic");
    expect(fetchEventLogsContract).not.toHaveBeenCalled();
    expect(stopSyncingInChain).toHaveBeenCalledWith("matic");
  });

  test("when an error comes before the contracts start", async () => {
    const error: Error = new Error("unexpected");
    vi.mocked(startUpdateLatestBlockNumber).mockRejectedValue(error);

    await expect(fetchEventLogs(matic)).rejects.toBe(error);

    expect(spyLogs.error).toHaveBeenCalledWith(
      "Fetch event logs. Stop syncing the chain after an error.",
      expect.objectContaining({
        chainName: "matic",
        reason: "UNEXPECTED_ERROR",
      }),
    );
    expect(get(storeSyncStoppedReason).matic).toBe("UNEXPECTED_ERROR");
    expect(startAbortingInChain).toHaveBeenCalledExactlyOnceWith("matic");
    expect(stopSyncingInChain).toHaveBeenCalledWith("matic");
  });

  test("when a contract ends with an error", async () => {
    vi.mocked(fetchEventLogsContract).mockRejectedValueOnce(
      makeError("server response 401 Unauthorized", "SERVER_ERROR", {
        request: new FetchRequest("https://rpc.example/secret-key"),
        info: { requestUrl: "https://rpc.example/secret-key" },
      }),
    );

    await fetchEventLogs(matic);

    // Without the request URL of the ethers error.
    expect(spyLogs.error).toHaveBeenCalledExactlyOnceWith(
      "Fetch event logs. Stop syncing the chain:",
      {
        chainName: "matic",
        reason: "UNEXPECTED_ERROR",
        contractName: expect.any(String),
        error: {
          code: "SERVER_ERROR",
          shortMessage: "server response 401 Unauthorized",
        },
      },
    );
    expect(get(storeSyncStoppedReason).matic).toBe("UNEXPECTED_ERROR");
    expect(startAbortingInChain).toHaveBeenCalledExactlyOnceWith("matic");
    expect(stopSyncingInChain).toHaveBeenCalledWith("matic");
  });
});
