import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { afterEach, beforeEach, expect, test } from "vitest";

// A file of more logs than CHUNK_LOGS without decoding 20,000 logs, which is
// slow with the coverage of CI. Read when the scripts are imported.
process.env.WARP_SYNC_CHUNK_LOGS = "10";
const { loadChain } = await import("./build-snapshot.mjs");
const { convertSnapshot } = await import("./convert-snapshot.mjs");
const { CHUNK_LOGS, sha256 } = await import("./snapshot-format.mjs");

const chain = loadChain("matic");
const feePot = chain.contracts.find((c) => c.name === "FeePot");
const ammFactory = chain.contracts.find((c) => c.name === "AMMFactory");
const keyOf = (contract) => ({
  project: contract.project,
  version: contract.version,
  name: contract.name,
});
const FROM = "0x1111111111111111111111111111111111111111";
const TO = "0x2222222222222222222222222222222222222222";
const toHex = (value) => `0x${value.toString(16)}`;

// A log of formatVersion 2: as the RPC returned it.
function rawLog(block, index, value) {
  const { data, topics } = feePot.iface.encodeEventLog(
    feePot.iface.getEvent("Transfer"),
    [FROM, TO, value],
  );
  return {
    blockNumber: toHex(block),
    blockHash: `0x${block.toString(16).padStart(64, "0")}`,
    blockTimestamp: toHex(block * 2),
    transactionHash: `0x${(block * 10 + index).toString(16).padStart(64, "0")}`,
    transactionIndex: "0x0",
    logIndex: toHex(index),
    address: feePot.address.toLowerCase(),
    data,
    topics,
  };
}
// The same log in formatVersion 3.
const v3Log = (raw, value) => ({
  blockNumber: raw.blockNumber,
  blockTimestamp: raw.blockTimestamp,
  transactionHash: raw.transactionHash,
  transactionIndex: raw.transactionIndex,
  logIndex: raw.logIndex,
  event: "Transfer",
  args: [FROM, TO, String(value)],
});

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-convert-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

// Writes a file and a manifest of formatVersion 2.
function writeV2(chunks) {
  const rows = chunks.map(({ contract, fromBlock, toBlock, logs }) => {
    const row = { ...keyOf(contract), fromBlock, toBlock };
    if (logs.length === 0) return { ...row, logCount: 0, file: null };
    const text = JSON.stringify({
      formatVersion: 2,
      chainId: 137,
      ...keyOf(contract),
      address: contract.address,
      fromBlock,
      toBlock,
      logs,
    });
    const gzip = zlib.gzipSync(text);
    const file = `${contract.project}-${contract.version}-${contract.name}-${toBlock}.json.gz`;
    fs.writeFileSync(path.join(dir, file), gzip);
    return {
      ...row,
      logCount: logs.length,
      file,
      bytes: gzip.length,
      rawBytes: Buffer.byteLength(text),
      sha256: sha256(gzip),
      rawSha256: sha256(text),
    };
  });
  const manifest = {
    formatVersion: 2,
    chainName: "matic",
    chainId: 137,
    contracts: [feePot, ammFactory].map((contract) => ({
      ...keyOf(contract),
      address: contract.address,
      creationBlock: contract.creationBlock,
    })),
    runs: [
      {
        createdAt: "2026-10-01T00:00:00.000Z",
        latestBlockNumber: 30_000_128,
        toBlock: 30_000_000,
        logCount: rows.reduce((sum, row) => sum + row.logCount, 0),
      },
    ],
    chunks: rows,
    totals: { logCount: 0, bytes: 0, rawBytes: 0 },
  };
  manifest.totals.logCount = manifest.runs[0].logCount;
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest));
  return manifest;
}
const read = (file) =>
  JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, file))).toString());
const snapshotFiles = () =>
  Object.fromEntries(
    fs
      .readdirSync(dir)
      .map((file) => [file, sha256(fs.readFileSync(path.join(dir, file)))]),
  );

test("replaces each file with a file of formatVersion 3 with the same name and logs", async () => {
  // More logs than CHUNK_LOGS: the file stays one file.
  expect(CHUNK_LOGS).toBe(10);
  const raws = Array.from({ length: CHUNK_LOGS + 5 }, (_, i) =>
    rawLog(20_000_000 + Math.floor(i / 2), i % 2, BigInt(i) * 10n ** 18n),
  );
  const old = writeV2([
    {
      contract: feePot,
      fromBlock: feePot.creationBlock,
      toBlock: 25_000_000,
      logs: raws,
    },
    {
      contract: ammFactory,
      fromBlock: ammFactory.creationBlock,
      toBlock: 25_000_000,
      logs: [],
    },
    {
      contract: feePot,
      fromBlock: 25_000_001,
      toBlock: 30_000_000,
      logs: [rawLog(26_000_000, 0, 7n)],
    },
  ]);

  await convertSnapshot({ dir, log: () => {} });

  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, "manifest.json"), "utf8"),
  );
  expect(manifest.formatVersion).toBe(3);
  expect(manifest.contracts).toEqual(old.contracts);
  expect(manifest.runs).toEqual(old.runs);
  expect(manifest.totals.logCount).toBe(CHUNK_LOGS + 6);
  // Only the size and the hashes of the files change.
  const keep = (chunk) => ({
    ...chunk,
    bytes: undefined,
    rawBytes: undefined,
    sha256: undefined,
    rawSha256: undefined,
  });
  expect(manifest.chunks.map(keep)).toEqual(old.chunks.map(keep));
  for (const chunk of manifest.chunks.filter((c) => c.file !== null)) {
    const gzip = fs.readFileSync(path.join(dir, chunk.file));
    expect(chunk.bytes).toBe(gzip.length);
    expect(chunk.sha256).toBe(sha256(gzip));
    expect(chunk.rawSha256).toBe(sha256(zlib.gunzipSync(gzip)));
  }
  const [first, , last] = manifest.chunks;
  expect(read(first.file)).toEqual({
    formatVersion: 3,
    chainId: 137,
    ...keyOf(feePot),
    address: feePot.address,
    fromBlock: feePot.creationBlock,
    toBlock: 25_000_000,
    logs: raws.map((raw, i) => v3Log(raw, BigInt(i) * 10n ** 18n)),
  });
  expect(read(last.file).logs).toEqual([v3Log(rawLog(26_000_000, 0, 7n), 7n)]);
  expect(fs.readdirSync(dir).sort()).toEqual(
    [first.file, last.file, "manifest.json"].sort(),
  );
});

test("stops at a log that cannot be decoded, and leaves the files as they were", async () => {
  const broken = { ...rawLog(26_000_000, 1, 1n), data: "0x" };
  writeV2([
    {
      contract: feePot,
      fromBlock: feePot.creationBlock,
      toBlock: 30_000_000,
      logs: [rawLog(26_000_000, 0, 1n), broken],
    },
  ]);
  const before = snapshotFiles();
  await expect(convertSnapshot({ dir, log: () => {} })).rejects.toThrow(
    "Augur/turbo/FeePot: cannot decode the log of Transfer at block 26000000, log index 1",
  );
  // .convert/ stays; the files of the snapshot do not change.
  const after = snapshotFiles();
  delete after[".convert"];
  expect(after).toEqual(before);
});

test("stops at a log of another address, and leaves the files as they were", async () => {
  const other = {
    ...rawLog(26_000_000, 1, 1n),
    address: `0x${"9".repeat(40)}`,
  };
  writeV2([
    {
      contract: feePot,
      fromBlock: feePot.creationBlock,
      toBlock: 30_000_000,
      logs: [rawLog(26_000_000, 0, 1n), other],
    },
  ]);
  const before = snapshotFiles();
  await expect(convertSnapshot({ dir, log: () => {} })).rejects.toThrow(
    `Augur/turbo/FeePot: a log of another address 0x${"9".repeat(40)} at block 26000000, log index 1.`,
  );
  const after = snapshotFiles();
  delete after[".convert"];
  expect(after).toEqual(before);
});

test("stops at a removed log", async () => {
  writeV2([
    {
      contract: feePot,
      fromBlock: feePot.creationBlock,
      toBlock: 30_000_000,
      logs: [{ ...rawLog(26_000_000, 0, 1n), removed: true }],
    },
  ]);
  await expect(convertSnapshot({ dir, log: () => {} })).rejects.toThrow(
    "Augur/turbo/FeePot: a removed log at block 26000000, log index 0.",
  );
});

test("stops at a file of another address", async () => {
  writeV2([
    {
      contract: { ...feePot, address: `0x${"9".repeat(40)}` },
      fromBlock: feePot.creationBlock,
      toBlock: 30_000_000,
      logs: [rawLog(26_000_000, 0, 1n)],
    },
  ]);
  await expect(convertSnapshot({ dir, log: () => {} })).rejects.toThrow(
    `Augur-turbo-FeePot-30000000.json.gz is for another address: 0x${"9".repeat(40)}`,
  );
});

test("stops at a log of an unknown topic0", async () => {
  const unknown = rawLog(26_000_000, 0, 1n);
  unknown.topics = [`0x${"ab".repeat(32)}`, ...unknown.topics.slice(1)];
  writeV2([
    {
      contract: feePot,
      fromBlock: feePot.creationBlock,
      toBlock: 30_000_000,
      logs: [unknown],
    },
  ]);
  await expect(convertSnapshot({ dir, log: () => {} })).rejects.toThrow(
    `cannot decode the log of topic0 0x${"ab".repeat(32)} at block 26000000`,
  );
});

test("stops when a file does not match its sha256", async () => {
  const { chunks } = writeV2([
    {
      contract: feePot,
      fromBlock: feePot.creationBlock,
      toBlock: 30_000_000,
      logs: [rawLog(26_000_000, 0, 1n)],
    },
  ]);
  fs.appendFileSync(path.join(dir, chunks[0].file), " ");
  await expect(convertSnapshot({ dir, log: () => {} })).rejects.toThrow(
    "does not match",
  );
});

test("stops at a contract that the chain does not have", async () => {
  writeV2([
    {
      contract: { ...feePot, name: "Gone" },
      fromBlock: feePot.creationBlock,
      toBlock: 30_000_000,
      logs: [rawLog(26_000_000, 0, 1n)],
    },
  ]);
  await expect(convertSnapshot({ dir, log: () => {} })).rejects.toThrow(
    "Augur/turbo/Gone of Augur-turbo-Gone-30000000.json.gz is not in the chain.",
  );
});

test("converts only formatVersion 2", async () => {
  fs.writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify({ formatVersion: 3 }),
  );
  await expect(convertSnapshot({ dir, log: () => {} })).rejects.toThrow(
    "has formatVersion 3",
  );
});
