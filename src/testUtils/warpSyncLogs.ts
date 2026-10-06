import type { Contract } from "#constants/chains/types.js";
import type { WarpSyncLog } from "#warpSync/warpSyncTypes.js";
import { toBeHex } from "ethers";
import {
  eventsByTopic0,
  toSnapshotLog,
} from "../../scripts/warp-sync/snapshot-log.mjs";

const hex = (value: number): `0x${string}` =>
  `0x${value.toString(16)}` as `0x${string}`;

// A log as the RPC returns it, encoded with the ABI of the contract
// (lower-case address, hex numbers).
export function makeRpcLog(
  contract: Contract,
  eventName: string,
  values: unknown[],
  blockNumber: number,
  logIndex: number = 0,
) {
  const contractInterface = contract.contractInterface;
  const { data, topics } = contractInterface.encodeEventLog(
    contractInterface.getEvent(eventName)!,
    values,
  );
  return {
    blockNumber: hex(blockNumber),
    blockHash: toBeHex(blockNumber, 32) as `0x${string}`,
    blockTimestamp: hex(1_600_000_000 + blockNumber),
    transactionHash: toBeHex(
      blockNumber * 1000 + logIndex,
      32,
    ) as `0x${string}`,
    transactionIndex: "0x0" as `0x${string}`,
    logIndex: hex(logIndex),
    address: contract.address.toLowerCase() as `0x${string}`,
    data: data as `0x${string}`,
    topics: topics as `0x${string}`[],
  };
}

// A log of the snapshot, made from makeRpcLog by build-snapshot.mjs.
export function makeWarpSyncLog(
  contract: Contract,
  eventName: string,
  values: unknown[],
  blockNumber: number,
  logIndex: number = 0,
): WarpSyncLog {
  const rpcLog = makeRpcLog(contract, eventName, values, blockNumber, logIndex);
  return toSnapshotLog(
    {
      project: "",
      version: "",
      name: contract.name,
      iface: contract.contractInterface,
      events: eventsByTopic0(contract.contractInterface),
    },
    rpcLog,
    rpcLog.blockTimestamp,
  ) as WarpSyncLog;
}
