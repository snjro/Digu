import { beforeEach, describe, expect, test, vi } from "vitest";
import { fetchEventLogsContract } from "./eventLogsContract";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import { extractEventContracts, type NodeProvider } from "@utils/utilsEthers";
import { sleep } from "@utils/utilsCommon";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Chain, Contract } from "@constants/chains/types";
import type { DbEventLogs } from "@db/dbEventLogs";
import type { SyncStatusContract, SyncStatusesChain } from "@db/dbTypes";

vi.mock("@utils/utilsEthers", async (importOriginal) => {
  const original = await importOriginal<typeof import("@utils/utilsEthers")>();
  return { ...original, getEthersEventLogs: vi.fn().mockResolvedValue([]) };
});
vi.mock("@utils/utilsCommon", async (importOriginal) => {
  const original = await importOriginal<typeof import("@utils/utilsCommon")>();
  return { ...original, sleep: vi.fn().mockResolvedValue(undefined) };
});
vi.mock("./eventLogsContractUpdateTables");
vi.mock("@db/dbEventLogsDataHandlersSyncStatus");

const targetChain: Chain = TARGET_CHAINS[0];
const targetProject = targetChain.projects[0];
const targetVersion = targetProject.versions[0];
const targetContract: Contract = extractEventContracts(
  targetVersion.contracts,
)[0];
const dbEventLogs = {
  versionIdentifier: {
    chainName: targetChain.name,
    projectName: targetProject.name,
    versionName: targetVersion.name,
  },
} as DbEventLogs;

function contractInState(state: SyncStatusesChain): SyncStatusContract {
  return state[targetChain.name].subSyncStatuses[targetProject.name]
    .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name];
}

describe("fetchEventLogsContract", () => {
  const creationBlockNumber: number = targetContract.creation.blockNumber;
  // Differs from the chain constant, so that the test tells them apart.
  const blockIntervalMs: number = targetChain.blockIntervalMs - 1;

  beforeEach(() => {
    storeSyncStatus.update((state: SyncStatusesChain) => {
      Object.assign(contractInState(state), {
        isSyncTarget: true,
        isAbort: false,
        fetchedBlockNumber: creationBlockNumber,
      });
      return state;
    });
    storeRpcSettings.updateState(targetChain.name, {
      bulkUnit: 100,
      blockIntervalMs,
    });
    // The first blocks reach the latest block, so the loop sleeps.
    storeChainStatus.updateState(targetChain.name, {
      latestBlockNumber: creationBlockNumber + 10,
    });
    // Abort after the first registration so that the loop ends.
    vi.mocked(registerEventLogsAndBlockTimes).mockImplementation(async () => {
      storeSyncStatus.update((state: SyncStatusesChain) => {
        contractInState(state).isAbort = true;
        return state;
      });
    });
  });

  test("should sleep for blockIntervalMs of the RPC settings at the latest block", async () => {
    await fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      null as unknown as NodeProvider,
    );

    expect(vi.mocked(sleep).mock.calls).toEqual([[blockIntervalMs]]);
  });
});
