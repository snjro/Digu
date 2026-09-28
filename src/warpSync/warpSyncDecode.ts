import type { Contract } from "@constants/chains/types";
import type { EthersEventLog } from "@db/dbTypes";
import { extractDecodedEventLogs } from "@utils/utilsEthers";
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
  const logs: Array<EventLog | Log> = warpSyncLogs.map(
    (warpSyncLog: WarpSyncLog) => {
      const logParams: LogParams = {
        address: getAddress(warpSyncLog.address),
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
      let fragment: EventFragment | null = null;
      try {
        fragment = contractInterface.getEvent(warpSyncLog.topics[0]);
      } catch {
        // Like queryFilter: a log of an unknown event stays a Log.
      }
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
