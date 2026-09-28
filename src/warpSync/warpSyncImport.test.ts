import "fake-indexeddb/auto";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Chain, Contract } from "@constants/chains/types";
import { getDbEventLogs } from "@db/dbEventLogs";
import {
  getDbRecordChainStatus,
  updateDbItemChainStatus,
} from "@db/dbChainStatusDataHandlers";
import { DB_TABLE_NAMES } from "@db/constants";
import { startDbWorker } from "@db/db.worker.portal";
import type {
  ConvertedEventLog,
  SyncStatusContract,
  VersionIdentifier,
} from "@db/dbTypes";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import Dexie from "dexie";
import { get } from "svelte/store";
import { makeWarpSyncLog } from "../testUtils/warpSyncLogs";
import {
  anySignal,
  getWarpSyncPending,
  importWarpSync,
} from "./warpSyncImport";
import type {
  WarpSyncLog,
  WarpSyncManifest,
  WarpSyncManifestChunk,
} from "./warpSyncTypes";

vi.mock("$app/paths", () => ({ base: "" }));
// The worker runs in this process: the same function, without a Worker.
vi.mock("@db/db.worker.portal", () => ({
  startDbWorker: vi.fn(
    async (message: { targetFunctionName: string; params: unknown }) => {
      const { executeTargetFunction } =
        await import("@db/db.worker.executeTargetFunction");
      return await executeTargetFunction(
        message.targetFunctionName as "importWarpSyncFile",
        message.params as never,
      );
    },
  ),
}));
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const matic: Chain = TARGET_CHAINS.find((chain) => chain.name === "matic")!;
const project = matic.projects[0];
const version = project.versions[0];
const feePot: Contract = version.contracts.find((c) => c.name === "FeePot")!;
const versionIdentifier: VersionIdentifier = {
  chainName: matic.name,
  projectName: project.name,
  versionName: version.name,
};
const CREATION = feePot.creation.blockNumber;
const FROM = "0x1111111111111111111111111111111111111111";
const TO = "0x2222222222222222222222222222222222222222";
const key = { project: project.name, version: version.name, name: feePot.name };

// A file to 20,000,000, a range without logs to 25,000,000, and a file to
// 30,000,000.
const ranges: [number, number, WarpSyncLog[] | null][] = [
  [
    CREATION,
    20_000_000,
    [
      makeWarpSyncLog(feePot, "Transfer", [FROM, TO, 1n], CREATION + 10, 0),
      makeWarpSyncLog(feePot, "Approval", [FROM, TO, 2n], CREATION + 10, 1),
      makeWarpSyncLog(feePot, "Transfer", [FROM, TO, 3n], 19_000_000, 0),
    ],
  ],
  [20_000_001, 25_000_000, null],
  [
    25_000_001,
    30_000_000,
    [makeWarpSyncLog(feePot, "Transfer", [FROM, TO, 4n], 26_000_000, 0)],
  ],
];
const sha256 = (data: Uint8Array | string) =>
  createHash("sha256").update(data).digest("hex");
const files: Map<string, Uint8Array> = new Map();
const chunks: WarpSyncManifestChunk[] = ranges.map(
  ([fromBlock, toBlock, logs], index) => {
    const range = { ...key, fromBlock, toBlock, logCount: logs?.length ?? 0 };
    if (logs === null) return { ...range, file: null };
    // The first file starts at the creation block unless a test moves it.
    const text = JSON.stringify({
      formatVersion: 2,
      chainId: 137,
      ...key,
      address: feePot.address,
      fromBlock: index === 0 ? CREATION : fromBlock,
      toBlock,
      logs,
    });
    const gzip = new Uint8Array(gzipSync(text));
    const file = `Augur-turbo-FeePot-${toBlock}.json.gz`;
    files.set(file, gzip);
    return {
      ...range,
      file,
      bytes: gzip.length,
      rawBytes: text.length,
      sha256: sha256(gzip),
      rawSha256: sha256(text),
    };
  },
);
function manifest(
  change: Partial<WarpSyncManifest["contracts"][number]> = {},
  firstFromBlock: number = CREATION,
): WarpSyncManifest {
  return {
    formatVersion: 2,
    chainName: "matic",
    chainId: 137,
    contracts: [
      { ...key, address: feePot.address, creationBlock: CREATION, ...change },
    ],
    runs: [
      {
        createdAt: "2026-09-28T00:00:00.000Z",
        latestBlockNumber: 30_000_128,
        toBlock: 30_000_000,
        logCount: 4,
      },
    ],
    chunks: [{ ...chunks[0], fromBlock: firstFromBlock }, ...chunks.slice(1)],
    totals: { logCount: 4, bytes: 0, rawBytes: 0 },
  };
}
const fetchedFiles = () =>
  fetchMock.mock.calls.map(([url]) => String(url).split("/").at(-1));

const db = () => getDbEventLogs(versionIdentifier);
async function rows(eventName: string): Promise<ConvertedEventLog[]> {
  return await db().table(`FeePot_${eventName}`).toArray();
}
async function syncStatus(): Promise<SyncStatusContract> {
  return await db().table(DB_TABLE_NAMES.EventLog.syncStatus).get("FeePot");
}
async function setFetchedBlockNumber(fetchedBlockNumber: number) {
  await db()
    .table(DB_TABLE_NAMES.EventLog.syncStatus)
    .update("FeePot", { fetchedBlockNumber });
}

describe("importWarpSync", () => {
  beforeEach(async () => {
    await Dexie.delete(db().name);
    await updateDbItemChainStatus("matic", "latestBlockNumber", 0);
    vi.mocked(startDbWorker).mockClear();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) => {
      const gzip = files.get(url.split("/").at(-1)!);
      return gzip
        ? new Response(gzip as BodyInit)
        : new Response("", { status: 404 });
    });
  });

  test("imports every file into a DB that has nothing yet, in the DB worker", async () => {
    expect(await importWarpSync(matic, manifest())).toBe(30_000_000);

    const transfers = await rows("Transfer");
    expect(transfers.map((row) => row.blockNumber)).toEqual([
      CREATION + 10,
      19_000_000,
      26_000_000,
    ]);
    expect(transfers.map((row) => row.args)).toEqual([
      [FROM, TO, 1n],
      [FROM, TO, 3n],
      [FROM, TO, 4n],
    ]);
    expect(transfers[0].jsDate).toEqual(
      new Date((1_600_000_000 + CREATION + 10) * 1000),
    );
    expect(transfers[0].address).toBe(feePot.address);
    expect((await rows("Approval")).map((row) => row.logIndex)).toEqual([1]);

    const status = await syncStatus();
    expect(status.fetchedBlockNumber).toBe(30_000_000);
    expect(status.events).toEqual({
      Approval: { recordCount: 1 },
      Transfer: { recordCount: 3 },
    });
    const storeContract =
      get(storeSyncStatus).matic.subSyncStatuses[project.name].subSyncStatuses[
        version.name
      ].subSyncStatuses.FeePot!;
    expect(storeContract.fetchedBlockNumber).toBe(30_000_000);
    expect(storeContract.events.Transfer?.recordCount).toBe(3);

    // One worker for each file; the range without logs needs none.
    expect(startDbWorker).toHaveBeenCalledTimes(2);
    expect(vi.mocked(startDbWorker).mock.calls[0][0]).toMatchObject({
      targetFunctionName: "importWarpSyncFile",
      params: {
        versionIdentifier,
        contractName: "FeePot",
        chainId: 137,
        url: new URL(
          "/warp-sync/matic/Augur-turbo-FeePot-20000000.json.gz",
          location.href,
        ).href,
      },
    });

    // The progress uses it when there is no RPC.
    expect((await getDbRecordChainStatus("matic")).latestBlockNumber).toBe(
      30_000_000,
    );
    expect(get(storeChainStatus).matic.latestBlockNumber).toBe(30_000_000);
  });

  test("imports only the logs after the fetched block", async () => {
    await setFetchedBlockNumber(19_500_000);
    await importWarpSync(matic, manifest());
    expect((await rows("Transfer")).map((row) => row.blockNumber)).toEqual([
      26_000_000,
    ]);
    expect(await rows("Approval")).toEqual([]);
    expect((await syncStatus()).fetchedBlockNumber).toBe(30_000_000);
  });

  test("skips the files that the DB has, and moves over a range without logs", async () => {
    await setFetchedBlockNumber(20_000_000);
    await importWarpSync(matic, manifest());
    expect(fetchedFiles()).toEqual(["Augur-turbo-FeePot-30000000.json.gz"]);
    expect((await syncStatus()).fetchedBlockNumber).toBe(30_000_000);
  });

  test("fetches nothing when the DB has the whole snapshot", async () => {
    await setFetchedBlockNumber(31_000_000);
    expect(await importWarpSync(matic, manifest())).toBe(30_000_000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await syncStatus()).fetchedBlockNumber).toBe(31_000_000);
  });

  test("keeps the files imported before a file that fails", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("30000000.json.gz")
        ? new Response("", { status: 500 })
        : new Response(files.get(url.split("/").at(-1)!)! as BodyInit),
    );
    await expect(importWarpSync(matic, manifest())).rejects.toThrow("HTTP 500");
    expect((await syncStatus()).fetchedBlockNumber).toBe(25_000_000);
    expect(await rows("Transfer")).toHaveLength(2);
  });

  test("skips a contract whose logs would have a gap", async () => {
    await importWarpSync(matic, manifest({}, CREATION + 100));
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await syncStatus()).fetchedBlockNumber).toBe(CREATION);
  });

  test("imports nothing for a contract with another address", async () => {
    expect(
      await importWarpSync(
        matic,
        manifest({ address: "0x0000000000000000000000000000000000000001" }),
      ),
    ).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await getDbRecordChainStatus("matic")).latestBlockNumber).toBe(0);
  });

  test("compares with the latest block number of the DB, not of the store", async () => {
    await updateDbItemChainStatus("matic", "latestBlockNumber", 40_000_000);
    // Like a store that lags behind another tab.
    storeChainStatus.updateState("matic", { latestBlockNumber: 0 });
    await importWarpSync(matic, manifest());
    expect((await getDbRecordChainStatus("matic")).latestBlockNumber).toBe(
      40_000_000,
    );
  });

  test("does not lower the latest block number", async () => {
    await updateDbItemChainStatus("matic", "latestBlockNumber", 40_000_000);
    await importWarpSync(matic, manifest());
    expect((await getDbRecordChainStatus("matic")).latestBlockNumber).toBe(
      40_000_000,
    );
  });
});

describe("getWarpSyncPending", () => {
  beforeEach(async () => {
    await Dexie.delete(db().name);
  });
  const file = (index: number) =>
    chunks[index] as Extract<WarpSyncManifestChunk, { file: string }>;

  test("counts every range for a DB that has nothing", async () => {
    expect(await getWarpSyncPending(matic, manifest())).toEqual({
      logCount: 4,
      snapshotLogCount: 4,
      bytes: file(0).bytes + file(2).bytes,
      rawBytes: file(0).rawBytes + file(2).rawBytes,
      files: 2,
    });
  });
  test("counts only the ranges after the fetched block", async () => {
    await setFetchedBlockNumber(20_000_000);
    expect(await getWarpSyncPending(matic, manifest())).toEqual({
      logCount: 1,
      snapshotLogCount: 4,
      bytes: file(2).bytes,
      rawBytes: file(2).rawBytes,
      files: 1,
    });
    await setFetchedBlockNumber(31_000_000);
    expect((await getWarpSyncPending(matic, manifest())).files).toBe(0);
  });
  test("counts nothing after a gap, like the import", async () => {
    expect(
      await getWarpSyncPending(matic, manifest({}, CREATION + 100)),
    ).toEqual({
      logCount: 0,
      snapshotLogCount: 4,
      bytes: 0,
      rawBytes: 0,
      files: 0,
    });
  });
});

describe("importWarpSync with options", () => {
  beforeEach(async () => {
    await Dexie.delete(db().name);
    vi.mocked(startDbWorker).mockClear();
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      async (url: string) =>
        new Response(files.get(url.split("/").at(-1)!)! as BodyInit),
    );
  });

  test("tells each range once saved, and gives the worker a signal", async () => {
    const done: number[] = [];
    await importWarpSync(matic, manifest(), {
      onRangeDone: (chunk) => done.push(chunk.toBlock),
    });
    expect(done).toEqual([20_000_000, 25_000_000, 30_000_000]);
    for (const [, signal] of vi.mocked(startDbWorker).mock.calls) {
      expect(signal).toBeInstanceOf(AbortSignal);
    }
  });

  test("stops before the next range once aborted, and keeps what was saved", async () => {
    const controller = new AbortController();
    await expect(
      importWarpSync(matic, manifest(), {
        signal: controller.signal,
        onRangeDone: () => controller.abort(new Error("stop")),
      }),
    ).rejects.toThrow("stop");
    expect((await syncStatus()).fetchedBlockNumber).toBe(20_000_000);
    expect(startDbWorker).toHaveBeenCalledTimes(1);
  });
});

describe("anySignal", () => {
  test.each([
    ["with AbortSignal.any", false],
    ["without AbortSignal.any (older browsers)", true],
  ])("is aborted when either is, %s", (_, remove) => {
    const any = AbortSignal.any;
    if (remove) (AbortSignal as { any?: unknown }).any = undefined;
    try {
      const first = new AbortController();
      const second = new AbortController();
      const signal = anySignal(first.signal, second.signal);
      expect(signal.aborted).toBe(false);
      second.abort(new Error("second"));
      expect(signal.aborted).toBe(true);
      expect((signal.reason as Error).message).toBe("second");
      const done = new AbortController();
      done.abort(new Error("before"));
      expect(anySignal(done.signal, new AbortController().signal).aborted).toBe(
        true,
      );
    } finally {
      AbortSignal.any = any;
    }
  });
});
