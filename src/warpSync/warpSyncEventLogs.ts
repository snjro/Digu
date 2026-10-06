import type { Contract } from "#constants/chains/types.js";
import type { NamedEventLog } from "#db/dbTypes.js";
import { makeNamedEventLog } from "#eventLogs/eventLogsContractUpdateTables.js";
import { getNumber, type EventFragment, type ParamType } from "ethers";
import type { WarpSyncLog } from "./warpSyncTypes";

type ReadValue = (value: unknown) => unknown;

// Gives back the values of the sync from the JSON of the snapshot: a bigint
// for each integer, by the ABI types.
function makeReadValue(param: ParamType): ReadValue {
  if (param.isArray()) {
    const readChild: ReadValue = makeReadValue(param.arrayChildren);
    return (value) => (value as unknown[]).map((child) => readChild(child));
  }
  if (param.isTuple()) return makeReadValues(param.components);
  if (/^u?int\d*$/.test(param.baseType)) {
    return (value) => BigInt(value as string);
  }
  return (value) => value;
}
function makeReadValues(params: readonly ParamType[]): ReadValue {
  const readValues: ReadValue[] = params.map(makeReadValue);
  return (values) =>
    (values as unknown[]).map((value, index) => readValues[index](value));
}

// The rows of the logs of the snapshot, the same as the sync's.
export function makeWarpSyncEventLogs(
  contract: Contract,
  logs: WarpSyncLog[],
): NamedEventLog[] {
  const readArgsByEvent: Map<string, ReadValue> = new Map();
  contract.contractInterface.forEachEvent((fragment: EventFragment) => {
    readArgsByEvent.set(fragment.name, makeReadValues(fragment.inputs));
  });
  return logs.map((log: WarpSyncLog) => {
    const readArgs: ReadValue | undefined = readArgsByEvent.get(log.event);
    if (!readArgs) {
      throw new Error(`${contract.name} has no event ${log.event}.`);
    }
    return makeNamedEventLog(
      {
        eventName: log.event,
        args: readArgs(log.args) as unknown[],
        blockNumber: getNumber(log.blockNumber),
        logIndex: getNumber(log.logIndex),
        removed: false,
        transactionHash: log.transactionHash,
        transactionIndex: getNumber(log.transactionIndex),
      },
      log.blockTimestamp === undefined
        ? undefined
        : getNumber(log.blockTimestamp),
    );
  });
}
