import "fake-indexeddb/auto";
import { describe, expect, test, vi } from "vitest";
import Dexie from "dexie";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { DB_NAME } from "@db/constants";
import { dbWorkerFuncGetConvertedEventLogs } from "@db/db.worker.func.getConvertedEventLogs";
import { initializeDBSyncStatusInChain } from "@db/db.worker.func.InitializeDBSyncStatus";
import { updateSyncStatusInChain } from "@db/dbEventLogsDataHandlersSyncStatusUpdateSyncStatusInChain";
import { initializeStore } from "../initialization/initializeStore";
import { toggleIsSyncTarget } from "$lib/common/toggleSyncTarget";
import { extractEventContracts } from "@utils/utilsEthers";

vi.mock("@utils/logger", () => ({
  customLogger: class {
    static start() {}
    static finished() {}
    static fail() {}
    static error() {}
    static fatal() {}
    static warn() {}
    static debug() {}
  },
}));

const chain = TARGET_CHAINS[0];
const project = chain.projects[0];
const version = project.versions[0];
const contract = extractEventContracts(version.contracts)[0];
const dbName: string = [
  DB_NAME.firstName,
  DB_NAME.secondNames.eventLog,
  chain.name,
  project.name,
  version.name,
].join("_");

// Not in Dexie's types. Lists the open databases of this page.
function openConnections(): number {
  const { connections } = Dexie as unknown as { connections: Dexie[] };
  return connections.filter((db) => db.name === dbName).length;
}
// Each call reuses the connection that the first call opened.
async function expectNoNewConnection(
  call: () => Promise<unknown>,
): Promise<void> {
  await call();
  const count: number = openConnections();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < 3; i++) await call();
  expect(openConnections()).toBe(count);
}

describe("the connections to the DB of a version", () => {
  test("initializeStore() does not open more each time", async () => {
    await expectNoNewConnection(() => initializeStore());
  });
  test("toggleIsSyncTarget() does not open more each time", async () => {
    await expectNoNewConnection(() =>
      toggleIsSyncTarget(chain.name, project.name, version.name, contract.name),
    );
  });
  test("updateSyncStatusInChain() does not open more each time", async () => {
    await expectNoNewConnection(() =>
      updateSyncStatusInChain(chain.name, "isSyncing", true, "isAbort", false),
    );
  });
  test("initializeDBSyncStatusInChain() does not open more each time", async () => {
    await expectNoNewConnection(() =>
      initializeDBSyncStatusInChain(chain, false),
    );
  });
  test("dbWorkerFuncGetConvertedEventLogs() does not open more each time", async () => {
    await expectNoNewConnection(() =>
      dbWorkerFuncGetConvertedEventLogs({
        chainName: chain.name,
        projectName: project.name,
        versionName: version.name,
        contractName: contract.name,
        abiFragmentName: contract.events.names[0],
      }),
    );
  });
});
