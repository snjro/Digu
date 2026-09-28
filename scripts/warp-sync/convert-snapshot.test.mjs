import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { afterEach, beforeEach, expect, test } from "vitest";
import { convertSnapshot } from "./convert-snapshot.mjs";

const log = (block, index) => ({
  blockNumber: `0x${block.toString(16)}`,
  blockHash: "0x00",
  blockTimestamp: "0x01",
  transactionHash: "0x02",
  transactionIndex: "0x0",
  logIndex: `0x${index.toString(16)}`,
  address: "0xa",
  data: "0x",
  topics: ["0x03"],
});
const contracts = [
  {
    project: "Augur",
    version: "turbo",
    name: "A",
    address: "0xA",
    creationBlock: 10,
  },
  {
    project: "Augur",
    version: "turbo",
    name: "B",
    address: "0xB",
    creationBlock: 20,
  },
];

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-convert-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

function writeV1(file, ranges) {
  const text = JSON.stringify({
    formatVersion: 1,
    chainId: 137,
    contracts: ranges.map((r) => ({
      ...r,
      address: contracts.find((c) => c.name === r.name).address,
    })),
  });
  fs.writeFileSync(path.join(dir, file), text);
  return crypto.createHash("sha256").update(text).digest("hex");
}

test("converts the snapshot to formatVersion 2 with the same logs", async () => {
  const aLogs = Array.from({ length: 25_000 }, (_, i) =>
    log(10 + Math.floor(i / 2), i % 2),
  );
  const first = [
    {
      project: "Augur",
      version: "turbo",
      name: "A",
      fromBlock: 10,
      toBlock: 100_000,
      logs: aLogs,
    },
    {
      project: "Augur",
      version: "turbo",
      name: "B",
      fromBlock: 20,
      toBlock: 100_000,
      logs: [],
    },
  ];
  const second = [
    {
      project: "Augur",
      version: "turbo",
      name: "A",
      fromBlock: 100_001,
      toBlock: 200_000,
      logs: [],
    },
    {
      project: "Augur",
      version: "turbo",
      name: "B",
      fromBlock: 100_001,
      toBlock: 200_000,
      logs: [log(150_000, 0)],
    },
  ];
  const manifest = {
    formatVersion: 1,
    chainName: "matic",
    chainId: 137,
    contracts,
    chunks: [
      {
        file: "logs-100000.json",
        sha256: writeV1("logs-100000.json", first),
        createdAt: "2026-09-01T00:00:00.000Z",
        latestBlockNumber: 100_200,
        logCount: 25_000,
        contracts: first.map(({ logs, ...r }) => ({
          ...r,
          logCount: logs.length,
        })),
      },
      {
        file: "logs-200000.json",
        sha256: writeV1("logs-200000.json", second),
        createdAt: "2026-09-02T00:00:00.000Z",
        latestBlockNumber: 200_200,
        logCount: 1,
        contracts: second.map(({ logs, ...r }) => ({
          ...r,
          logCount: logs.length,
        })),
      },
    ],
  };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest));

  await convertSnapshot({ dir, log: () => {} });

  const converted = JSON.parse(
    fs.readFileSync(path.join(dir, "manifest.json"), "utf8"),
  );
  expect(converted).toMatchObject({
    formatVersion: 2,
    chainName: "matic",
    chainId: 137,
    contracts,
  });
  expect(converted.runs).toEqual([
    {
      createdAt: "2026-09-01T00:00:00.000Z",
      latestBlockNumber: 100_200,
      toBlock: 100_000,
      logCount: 25_000,
    },
    {
      createdAt: "2026-09-02T00:00:00.000Z",
      latestBlockNumber: 200_200,
      toBlock: 200_000,
      logCount: 1,
    },
  ]);
  const rows = converted.chunks.map((r) => [
    r.name,
    r.fromBlock,
    r.toBlock,
    r.logCount,
    r.file,
  ]);
  expect(rows).toEqual([
    ["A", 10, 10_009, 20_000, "Augur-turbo-A-10009.json.gz"],
    ["A", 10_010, 100_000, 5_000, "Augur-turbo-A-100000.json.gz"],
    ["B", 20, 100_000, 0, null],
    ["A", 100_001, 200_000, 0, null],
    ["B", 100_001, 200_000, 1, "Augur-turbo-B-200000.json.gz"],
  ]);
  const read = (file) =>
    JSON.parse(
      zlib.gunzipSync(fs.readFileSync(path.join(dir, file))).toString(),
    );
  expect([...read(rows[0][4]).logs, ...read(rows[1][4]).logs]).toEqual(aLogs);
  expect(read(rows[4][4])).toMatchObject({
    address: "0xB",
    logs: [log(150_000, 0)],
  });
  expect(converted.totals.logCount).toBe(25_001);
  expect(fs.readdirSync(dir).sort()).toEqual(
    [
      "Augur-turbo-A-10009.json.gz",
      "Augur-turbo-A-100000.json.gz",
      "Augur-turbo-B-200000.json.gz",
      "manifest.json",
    ].sort(),
  );
});

test("stops when a file does not match its sha256", async () => {
  const sha256 = writeV1("logs-1.json", []);
  fs.appendFileSync(path.join(dir, "logs-1.json"), " ");
  fs.writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify({
      formatVersion: 1,
      chainName: "matic",
      chainId: 137,
      contracts,
      chunks: [{ file: "logs-1.json", sha256, contracts: [] }],
    }),
  );
  await expect(convertSnapshot({ dir, log: () => {} })).rejects.toThrow(
    "does not match",
  );
  expect(fs.existsSync(path.join(dir, "logs-1.json"))).toBe(true);
});
