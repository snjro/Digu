import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Chain, Contract } from "@constants/chains/types";
import { getDbEventLogs } from "@db/dbEventLogs";
import {
  getDbRecordChainStatus,
  updateDbItemChainStatus,
} from "@db/dbChainStatusDataHandlers";
import { DB_TABLE_NAMES } from "@db/constants";
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
import { fetchWarpSyncChunk } from "./warpSyncFetch";
import { importWarpSync } from "./warpSyncImport";
import type {
  WarpSyncChunk,
  WarpSyncLog,
  WarpSyncManifest,
  WarpSyncManifestChunk,
} from "./warpSyncTypes";

vi.mock("./warpSyncFetch", () => ({ fetchWarpSyncChunk: vi.fn() }));

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

// Two chunks: to 20,000,000 and to 30,000,000.
const chunkLogs: Record<string, [number, number, WarpSyncLog[]]> = {
  "logs-20000000.json": [
    CREATION,
    20_000_000,
    [
      makeWarpSyncLog(feePot, "Transfer", [FROM, TO, 1n], CREATION + 10, 0),
      makeWarpSyncLog(feePot, "Approval", [FROM, TO, 2n], CREATION + 10, 1),
      makeWarpSyncLog(feePot, "Transfer", [FROM, TO, 3n], 19_000_000, 0),
    ],
  ],
  "logs-30000000.json": [
    20_000_001,
    30_000_000,
    [makeWarpSyncLog(feePot, "Transfer", [FROM, TO, 4n], 25_000_000, 0)],
  ],
};
function manifest(
  change: Partial<WarpSyncManifest["contracts"][number]> = {},
  firstFromBlock: number = CREATION,
): WarpSyncManifest {
  const chunks: WarpSyncManifestChunk[] = Object.entries(chunkLogs).map(
    ([file, [fromBlock, toBlock, logs]], index) => ({
      file,
      sha256: "",
      createdAt: "",
      latestBlockNumber: 0,
      logCount: logs.length,
      contracts: [
        {
          ...key,
          fromBlock: index === 0 ? firstFromBlock : fromBlock,
          toBlock,
          logCount: logs.length,
        },
      ],
    }),
  );
  return {
    formatVersion: 1,
    chainName: "matic",
    chainId: 137,
    contracts: [
      { ...key, address: feePot.address, creationBlock: CREATION, ...change },
    ],
    chunks,
  };
}
vi.mocked(fetchWarpSyncChunk).mockImplementation(
  async (_, manifestChunk): Promise<WarpSyncChunk> => {
    const [fromBlock, toBlock, logs] = chunkLogs[manifestChunk.file];
    return {
      formatVersion: 1,
      chainId: 137,
      contracts: [
        { ...key, address: feePot.address, fromBlock, toBlock, logs },
      ],
    };
  },
);

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
    vi.mocked(fetchWarpSyncChunk).mockClear();
  });

  test("imports every chunk into a DB that has nothing yet", async () => {
    expect(await importWarpSync(matic, manifest())).toBe(30_000_000);

    const transfers = await rows("Transfer");
    expect(transfers.map((row) => row.blockNumber)).toEqual([
      CREATION + 10,
      19_000_000,
      25_000_000,
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
      25_000_000,
    ]);
    expect(await rows("Approval")).toEqual([]);
    expect((await syncStatus()).fetchedBlockNumber).toBe(30_000_000);
  });

  test("skips the chunks that the DB has", async () => {
    await setFetchedBlockNumber(20_000_000);
    await importWarpSync(matic, manifest());
    expect(fetchWarpSyncChunk).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchWarpSyncChunk).mock.calls[0][1].file).toBe(
      "logs-30000000.json",
    );
  });

  test("fetches nothing when the DB has the whole snapshot", async () => {
    await setFetchedBlockNumber(31_000_000);
    expect(await importWarpSync(matic, manifest())).toBe(30_000_000);
    expect(fetchWarpSyncChunk).not.toHaveBeenCalled();
    expect((await syncStatus()).fetchedBlockNumber).toBe(31_000_000);
  });

  test("skips a contract whose logs would have a gap", async () => {
    await importWarpSync(matic, manifest({}, CREATION + 100));
    expect(fetchWarpSyncChunk).not.toHaveBeenCalled();
    expect((await syncStatus()).fetchedBlockNumber).toBe(CREATION);
  });

  test("imports nothing for a contract with another address", async () => {
    expect(
      await importWarpSync(
        matic,
        manifest({ address: "0x0000000000000000000000000000000000000001" }),
      ),
    ).toBeUndefined();
    expect(fetchWarpSyncChunk).not.toHaveBeenCalled();
    expect((await getDbRecordChainStatus("matic")).latestBlockNumber).toBe(0);
  });

  test("does not lower the latest block number", async () => {
    await updateDbItemChainStatus("matic", "latestBlockNumber", 40_000_000);
    await importWarpSync(matic, manifest());
    expect((await getDbRecordChainStatus("matic")).latestBlockNumber).toBe(
      40_000_000,
    );
  });
});
