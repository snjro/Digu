import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { JsonRpcProvider, Network } from "ethers";
import type { JsonRpcPayload, JsonRpcResult } from "ethers";
import { fetchEventLogsContract } from "./eventLogsContract";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import { startAbortingInChain } from "@db/dbEventLogsDataHandlersSyncStatus";
import { extractEventContracts } from "@utils/utilsEthers";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Chain, Contract } from "@constants/chains/types";
import type { DbEventLogs } from "@db/dbEventLogs";
import type { SyncStatusContract, SyncStatusesChain } from "@db/dbTypes";

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
function abort(): void {
  storeSyncStatus.update((state: SyncStatusesChain) => {
    contractInState(state).isAbort = true;
    return state;
  });
}

// A real ethers provider, so that its request cache is used, with an RPC
// that fails the first eth_getLogs requests.
function providerFailingGetLogs(failCount: number): {
  provider: JsonRpcProvider;
  getLogsCount: () => number;
} {
  const network: Network = Network.from(targetChain.chainId);
  const provider = new JsonRpcProvider("http://fake-rpc.invalid/", network, {
    staticNetwork: network,
    batchMaxSize: 1,
  });
  let getLogsCount: number = 0;
  vi.spyOn(provider, "_send").mockImplementation(
    async (
      payload: JsonRpcPayload | JsonRpcPayload[],
    ): Promise<JsonRpcResult[]> => {
      return [payload].flat().map((request: JsonRpcPayload) => {
        if (request.method !== "eth_getLogs") {
          throw new Error(`unexpected method: ${request.method}`);
        }
        getLogsCount++;
        return getLogsCount <= failCount
          ? ({
              id: request.id,
              error: { code: -32000, message: "temporary error" },
            } as unknown as JsonRpcResult)
          : { id: request.id, result: [] };
      });
    },
  );
  return { provider, getLogsCount: () => getLogsCount };
}

describe("fetchEventLogsContract", () => {
  const creationBlockNumber: number = targetContract.creation.blockNumber;
  const bulkUnit: number = 100;
  const tryCount: number = 2;

  beforeEach(() => {
    vi.useFakeTimers();
    storeSyncStatus.update((state: SyncStatusesChain) => {
      Object.assign(contractInState(state), {
        isSyncTarget: true,
        isAbort: false,
        fetchedBlockNumber: creationBlockNumber,
      });
      return state;
    });
    // The smallest Block Interval, which is shorter than the cache of ethers.
    storeRpcSettings.updateState(targetChain.name, {
      bulkUnit,
      tryCount,
      blockIntervalMs: 1,
    });
    storeChainStatus.updateState(targetChain.name, {
      latestBlockNumber: creationBlockNumber + 10 * bulkUnit,
    });
    // End the loop after the first registration or when giving up.
    vi.mocked(registerEventLogsAndBlockTimes).mockImplementation(async () =>
      abort(),
    );
    vi.mocked(startAbortingInChain).mockImplementation(async () => abort());
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("should request eth_getLogs again after an error and continue", async () => {
    const { provider, getLogsCount } = providerFailingGetLogs(tryCount);

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    expect(startAbortingInChain).not.toHaveBeenCalled();
    expect(registerEventLogsAndBlockTimes).toHaveBeenCalledOnce();
    expect(getLogsCount()).toBe(tryCount + targetContract.events.names.length);
  });
});
