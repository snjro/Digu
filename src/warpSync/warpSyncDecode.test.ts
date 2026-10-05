import { describe, expect, test, vi } from "vitest";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Contract } from "#constants/chains/types.js";
import { customLogger } from "#utils/logger.js";
import { makeWarpSyncLog } from "../testUtils/warpSyncLogs";
import { EventLog } from "ethers";
import { decodeWarpSyncLogs } from "./warpSyncDecode";

const feePot: Contract = TARGET_CHAINS.find(
  (chain) => chain.name === "matic",
)!.projects[0].versions[0].contracts.find(
  (contract) => contract.name === "FeePot",
)!;
const FROM = "0x1111111111111111111111111111111111111111";
const TO = "0x2222222222222222222222222222222222222222";

describe("decodeWarpSyncLogs", () => {
  test("decodes the logs like the sync: EventLogs with the formatted fields", () => {
    const [log] = decodeWarpSyncLogs(feePot, [
      makeWarpSyncLog(feePot, "Transfer", [FROM, TO, 5n], 20_000_000, 3),
    ]);
    expect(log).toBeInstanceOf(EventLog);
    expect(log.eventName).toBe("Transfer");
    expect(log.eventSignature).toBe("Transfer(address,address,uint256)");
    expect([...log.args]).toEqual([FROM, TO, 5n]);
    expect(log.blockNumber).toBe(20_000_000);
    expect(log.index).toBe(3);
    expect(log.transactionIndex).toBe(0);
    expect(log.removed).toBe(false);
    // Checksummed, as ethers' formatLog does.
    expect(log.address).toBe(feePot.address);
  });

  test("skips a log of an unknown event, as the sync does", () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    const unknown = makeWarpSyncLog(feePot, "Transfer", [FROM, TO, 1n], 10);
    unknown.topics = [`0x${"ab".repeat(32)}`, ...unknown.topics.slice(1)];
    const logs = decodeWarpSyncLogs(feePot, [
      unknown,
      makeWarpSyncLog(feePot, "Approval", [FROM, TO, 2n], 11),
    ]);
    expect(logs.map((log) => log.eventName)).toEqual(["Approval"]);
    expect(customLogger.error).toHaveBeenCalledWith(
      "Skip an event log that could not be decoded.",
      expect.objectContaining({ blockNumber: 10 }),
    );
    vi.restoreAllMocks();
  });

  test("decodes each log to its own event, in order", () => {
    const logs = decodeWarpSyncLogs(feePot, [
      makeWarpSyncLog(feePot, "Transfer", [FROM, TO, 1n], 10),
      makeWarpSyncLog(feePot, "Approval", [FROM, TO, 2n], 11),
      makeWarpSyncLog(feePot, "Transfer", [TO, FROM, 3n], 12),
    ]);
    expect(
      logs.map((log) => [log.eventName, log.blockNumber, [...log.args]]),
    ).toEqual([
      ["Transfer", 10, [FROM, TO, 1n]],
      ["Approval", 11, [FROM, TO, 2n]],
      ["Transfer", 12, [TO, FROM, 3n]],
    ]);
  });

  test("finds the event of a topic0 with upper-case hex digits", () => {
    const log = makeWarpSyncLog(feePot, "Transfer", [FROM, TO, 1n], 10);
    log.topics = [
      `0x${log.topics[0].slice(2).toUpperCase()}`,
      ...log.topics.slice(1),
    ];
    const [decoded] = decodeWarpSyncLogs(feePot, [log]);
    expect(decoded.eventName).toBe("Transfer");
  });

  test("skips a log with no topics, as the sync does", () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    const noTopics = makeWarpSyncLog(feePot, "Transfer", [FROM, TO, 1n], 10);
    noTopics.topics = [];
    expect(decodeWarpSyncLogs(feePot, [noTopics])).toEqual([]);
    expect(customLogger.error).toHaveBeenCalledWith(
      "Skip an event log that could not be decoded.",
      expect.objectContaining({ blockNumber: 10 }),
    );
    vi.restoreAllMocks();
  });

  test("does not look up the event of each log with getEvent", () => {
    const warpSyncLogs = [
      makeWarpSyncLog(feePot, "Transfer", [FROM, TO, 1n], 10),
      makeWarpSyncLog(feePot, "Approval", [FROM, TO, 2n], 11),
    ];
    const getEvent = vi.spyOn(feePot.contractInterface, "getEvent");
    expect(decodeWarpSyncLogs(feePot, warpSyncLogs)).toHaveLength(2);
    expect(getEvent).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  test("skips a log that cannot be decoded", () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    const broken = makeWarpSyncLog(feePot, "Transfer", [FROM, TO, 1n], 10);
    broken.data = "0x01";
    expect(decodeWarpSyncLogs(feePot, [broken])).toEqual([]);
    vi.restoreAllMocks();
  });
});
