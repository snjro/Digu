import type { Contract } from "#constants/chains/types.js";
import type { EthersEventLog } from "#db/dbTypes.js";
import { extractDecodedEventLogs } from "#utils/utilsEthers.js";
import {
  EventLog,
  getAddress,
  getNumber,
  Log,
  UndecodedEventLog,
  type EventFragment,
  type LogParams,
  type Provider,
} from "ethers";
import type { WarpSyncLog } from "./warpSyncTypes";

// Decodes the logs of the snapshot as the sync does: like ethers'
// Contract.queryFilter, with the fields formatted like its formatLog. The logs
// that cannot be decoded are skipped, as in the sync.
export function decodeWarpSyncLogs(
  targetContract: Contract,
  warpSyncLogs: WarpSyncLog[],
): EthersEventLog[] {
  const contractInterface = targetContract.contractInterface;
  // getEvent hashes every event signature again for each log, so look the
  // events up by topic0 in a table made once.
  const fragments = new Map<string, EventFragment>();
  contractInterface.forEachEvent((fragment: EventFragment) => {
    fragments.set(fragment.topicHash, fragment);
  });
  const checksumAddresses = new Map<string, string>();
  const logs: Array<EventLog | Log> = warpSyncLogs.map(
    (warpSyncLog: WarpSyncLog) => {
      let address: string | undefined = checksumAddresses.get(
        warpSyncLog.address,
      );
      if (address === undefined) {
        address = getAddress(warpSyncLog.address);
        checksumAddresses.set(warpSyncLog.address, address);
      }
      const logParams: LogParams = {
        address,
        blockHash: warpSyncLog.blockHash,
        blockNumber: getNumber(warpSyncLog.blockNumber),
        data: warpSyncLog.data,
        index: getNumber(warpSyncLog.logIndex),
        removed: false,
        topics: warpSyncLog.topics,
        transactionHash: warpSyncLog.transactionHash,
        transactionIndex: getNumber(warpSyncLog.transactionIndex),
      };
      // No provider: nothing more is fetched for these logs.
      const log: Log = new Log(logParams, null as unknown as Provider);
      // Like queryFilter: a log of an unknown event stays a Log.
      const fragment: EventFragment | undefined = fragments.get(
        warpSyncLog.topics[0]?.toLowerCase(),
      );
      if (fragment) {
        try {
          return new EventLog(log, contractInterface, fragment);
        } catch (error) {
          return new UndecodedEventLog(log, error as Error);
        }
      }
      return log;
    },
  );
  return extractDecodedEventLogs(logs);
}
