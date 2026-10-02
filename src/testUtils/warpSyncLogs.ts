import type { Contract } from "#constants/chains/types.js";
import type { WarpSyncLog } from "#warpSync/warpSyncTypes.js";
import { toBeHex } from "ethers";

const hex = (value: number): `0x${string}` =>
  `0x${value.toString(16)}` as `0x${string}`;

// A log of the snapshot, encoded with the ABI of the contract, as the RPC
// returns it (lower-case address, hex numbers).
export function makeWarpSyncLog(
  contract: Contract,
  eventName: string,
  values: unknown[],
  blockNumber: number,
  logIndex: number = 0,
): WarpSyncLog {
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
    transactionIndex: "0x0",
    logIndex: hex(logIndex),
    address: contract.address.toLowerCase() as `0x${string}`,
    data: data as `0x${string}`,
    topics: topics as `0x${string}`[],
  };
}
