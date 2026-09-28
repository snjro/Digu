import type { Chain, ChainName } from "@constants/chains/types";
import { updateDbItemChainStatus } from "@db/dbChainStatusDataHandlers";
import { getDbEventLogs, type DbEventLogs } from "@db/dbEventLogs";
import { addEventLogs_updateFetchedBlockNumber } from "@db/dbEventLogsDataHandlersEventLog";
import { getDbItemSyncStatus } from "@db/dbEventLogsDataHandlersSyncStatusGetters";
import type {
  ConvertedEventLog,
  EthersEventLog,
  GroupedEventLogs,
} from "@db/dbTypes";
import {
  convertEthersEventToEventLog,
  groupEventLogsByEventName,
} from "@eventLogs/eventLogsContractUpdateTables";
import { storeChainStatus } from "@stores/storeChainStatus";
import { customLogger } from "@utils/logger";
import { getNumber } from "ethers";
import { get } from "svelte/store";
import { decodeWarpSyncLogs } from "./warpSyncDecode";
import { fetchWarpSyncChunk } from "./warpSyncFetch";
import {
  getNextBlock,
  getRangeAction,
  getWarpSyncEnd,
  getWarpSyncKey,
  matchWarpSyncContracts,
  type WarpSyncTarget,
} from "./warpSyncPlan";
import type {
  WarpSyncChunk,
  WarpSyncChunkContract,
  WarpSyncManifest,
  WarpSyncManifestChunk,
} from "./warpSyncTypes";

// Imports the chunks that have blocks the DB does not have yet. Run it while
// holding the sync lock of the chain. Returns the last block of the snapshot,
// or undefined when the snapshot has no contract of the app.
export async function importWarpSync(
  targetChain: Chain,
  manifest: WarpSyncManifest,
): Promise<number | undefined> {
  const targets: Map<string, WarpSyncTarget> = matchWarpSyncContracts(
    targetChain,
    manifest,
  );
  // A contract whose logs would have a gap is not imported any more.
  const stopped: Set<string> = new Set();
  for (const manifestChunk of manifest.chunks) {
    const keys: string[] = await getKeysToImport(
      manifestChunk,
      targets,
      stopped,
    );
    if (keys.length === 0) continue;
    const chunk: WarpSyncChunk = await fetchWarpSyncChunk(
      targetChain,
      manifestChunk,
    );
    for (const key of keys) {
      const chunkContract: WarpSyncChunkContract | undefined =
        chunk.contracts.find(
          (chunkContract) => getWarpSyncKey(chunkContract) === key,
        );
      if (!chunkContract) {
        throw new Error(`${manifestChunk.file} does not have ${key}.`);
      }
      await importWarpSyncContract(targets.get(key)!, chunkContract);
    }
  }
  const end: number | undefined = getWarpSyncEnd(manifest, targets);
  if (end !== undefined) await raiseLatestBlockNumber(targetChain.name, end);
  return end;
}

async function getKeysToImport(
  manifestChunk: WarpSyncManifestChunk,
  targets: Map<string, WarpSyncTarget>,
  stopped: Set<string>,
): Promise<string[]> {
  const keys: string[] = [];
  for (const range of manifestChunk.contracts) {
    const key: string = getWarpSyncKey(range);
    const target: WarpSyncTarget | undefined = targets.get(key);
    if (!target || stopped.has(key)) continue;
    const action = getRangeAction(
      range,
      await getFetchedBlockNumber(target),
      target.contract.creation.blockNumber,
    );
    if (action === "import") keys.push(key);
    if (action === "gap") {
      stopped.add(key);
      customLogger.fail("Skip the warp sync of a contract: a gap.", {
        contract: key,
        fromBlock: range.fromBlock,
      });
    }
  }
  return keys;
}

async function getFetchedBlockNumber(target: WarpSyncTarget): Promise<number> {
  const dbEventLogs: DbEventLogs = getDbEventLogs(target.versionIdentifier);
  return await getDbItemSyncStatus(
    dbEventLogs,
    target.contract.name,
    "fetchedBlockNumber",
  );
}

// Saves the logs after the ones in the DB, and moves fetchedBlockNumber to
// the end of the range, in one transaction, as the sync does.
export async function importWarpSyncContract(
  target: WarpSyncTarget,
  chunkContract: WarpSyncChunkContract,
): Promise<void> {
  const { contract } = target;
  const nextBlock: number = getNextBlock(
    await getFetchedBlockNumber(target),
    contract.creation.blockNumber,
  );
  const logs = chunkContract.logs.filter(
    (log) => getNumber(log.blockNumber) >= nextBlock,
  );
  const timestamps: Map<number, number> = new Map(
    logs.map((log) => [
      getNumber(log.blockNumber),
      getNumber(log.blockTimestamp),
    ]),
  );
  const ethersEventLogs: EthersEventLog[] = decodeWarpSyncLogs(contract, logs);
  const convertedEventLogs: ConvertedEventLog[] = ethersEventLogs.map(
    (ethersEventLog: EthersEventLog) =>
      convertEthersEventToEventLog(
        ethersEventLog,
        timestamps.get(ethersEventLog.blockNumber)!,
      ),
  );
  const groupedEventLogs: GroupedEventLogs =
    groupEventLogsByEventName(convertedEventLogs);
  await addEventLogs_updateFetchedBlockNumber(
    getDbEventLogs(target.versionIdentifier),
    contract,
    groupedEventLogs,
    chunkContract.toBlock,
  );
}

// Without an RPC, the latest block is 0 and the progress stays at 0%. The end
// of the snapshot is a block that exists and is at most latest -
// confirmationBlocks when it was made, so it can be the latest block until
// the sync gets the real one.
async function raiseLatestBlockNumber(
  chainName: ChainName,
  end: number,
): Promise<void> {
  const latestBlockNumber: number =
    get(storeChainStatus)[chainName].latestBlockNumber;
  if (end <= latestBlockNumber) return;
  await updateDbItemChainStatus(chainName, "latestBlockNumber", end);
}
