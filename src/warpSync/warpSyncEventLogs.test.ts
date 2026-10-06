import { describe, expect, test } from "vitest";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Contract } from "#constants/chains/types.js";
import { convertEthersEventToEventLog } from "#eventLogs/eventLogsContractUpdateTables.js";
import { EventLog, getAddress, getNumber, Log, type Provider } from "ethers";
import { makeRpcLog, makeWarpSyncLog } from "../testUtils/warpSyncLogs";
import { makeWarpSyncEventLogs } from "./warpSyncEventLogs";

function getContract(
  chainName: string,
  versionName: string,
  contractName: string,
): Contract {
  return TARGET_CHAINS.find((chain) => chain.name === chainName)!
    .projects[0].versions.find((version) => version.name === versionName)!
    .contracts.find((contract) => contract.name === contractName)!;
}
const augurV1 = getContract("eth", "version1", "Augur");
const augurV2 = getContract("eth", "version2", "Augur");
const shareToken = getContract("eth", "version2", "ShareToken");
const feePot = getContract("matic", "turbo", "FeePot");
const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";
const C = "0x3333333333333333333333333333333333333333";
const BYTES32 = `0x${"ab".repeat(32)}`;

// The sync gets the log from the RPC and decodes it with ethers, as
// Contract.queryFilter does.
function syncRow(
  contract: Contract,
  eventName: string,
  values: unknown[],
  blockNumber: number,
) {
  const rpcLog = makeRpcLog(contract, eventName, values, blockNumber, 2);
  const log = new Log(
    {
      address: getAddress(rpcLog.address),
      blockHash: rpcLog.blockHash,
      blockNumber: getNumber(rpcLog.blockNumber),
      data: rpcLog.data,
      index: getNumber(rpcLog.logIndex),
      removed: false,
      topics: rpcLog.topics,
      transactionHash: rpcLog.transactionHash,
      transactionIndex: getNumber(rpcLog.transactionIndex),
    },
    null as unknown as Provider,
  );
  const fragment = contract.contractInterface.getEvent(eventName)!;
  return convertEthersEventToEventLog(
    new EventLog(log, contract.contractInterface, fragment),
    getNumber(rpcLog.blockTimestamp),
  );
}
// The snapshot has the same log, decoded by build-snapshot.mjs, and the
// import reads it.
function importRow(
  contract: Contract,
  eventName: string,
  values: unknown[],
  blockNumber: number,
) {
  // Through JSON, like the file.
  const log = JSON.parse(
    JSON.stringify(
      makeWarpSyncLog(contract, eventName, values, blockNumber, 2),
    ),
  );
  return makeWarpSyncEventLogs(contract, [log])[0];
}

describe("makeWarpSyncEventLogs", () => {
  test.each([
    // bytes32 (indexed), string, address, bytes32[], uint256, int256, uint8
    [
      augurV1,
      "MarketCreated",
      [BYTES32, "a market", "{}", A, B, C, [BYTES32], 10n ** 18n, -5n, 2n, 1n],
    ],
    // int256[] with a negative number
    [
      augurV2,
      "MarketCreated",
      [
        A,
        1_700_000_000n,
        "{}",
        B,
        C,
        A,
        50n,
        [-1n, 10n ** 30n],
        0n,
        3n,
        [BYTES32, BYTES32],
        10n ** 18n,
        1_700_000_001n,
      ],
    ],
    // uint256[] named "values"
    [shareToken, "TransferBatch", [A, B, C, [1n, 2n], [3n, 10n ** 40n]]],
    [feePot, "Transfer", [A, B, 5n]],
  ])("makes the same row as the sync: %#", (contract, eventName, values) => {
    const fragment = contract.contractInterface.getEvent(eventName)!;
    expect(fragment.inputs).toHaveLength(values.length);
    const imported = importRow(contract, eventName, values, 20_000_000);
    expect(imported).toStrictEqual(
      syncRow(contract, eventName, values, 20_000_000),
    );
    expect(imported.eventName).toBe(eventName);
  });

  test("gives back a bigint for every integer, by the ABI types", () => {
    const { eventLog } = importRow(
      shareToken,
      "TransferBatch",
      [A, B, C, [1n, 2n], [3n, 4n]],
      10,
    );
    expect(eventLog.args).toStrictEqual([
      getAddress(A),
      getAddress(B),
      getAddress(C),
      [1n, 2n],
      [3n, 4n],
    ]);
    expect(eventLog.blockNumber).toBe(10);
    expect(eventLog.logIndex).toBe(2);
    expect(eventLog.jsDate).toEqual(new Date((1_600_000_000 + 10) * 1000));
  });

  test("throws for a log without blockTimestamp, as the sync does", () => {
    const log = makeWarpSyncLog(feePot, "Transfer", [A, B, 1n], 10);
    delete (log as Partial<typeof log>).blockTimestamp;
    expect(() => makeWarpSyncEventLogs(feePot, [log])).toThrow(
      "cannot find blocktime",
    );
  });

  test("throws for an event that the contract does not have", () => {
    const log = makeWarpSyncLog(feePot, "Transfer", [A, B, 1n], 10);
    log.event = "Unknown";
    expect(() => makeWarpSyncEventLogs(feePot, [log])).toThrow(
      "FeePot has no event Unknown.",
    );
  });
});
