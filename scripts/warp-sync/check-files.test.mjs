import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { WARP_SYNC_CHAIN_NAMES } from "../../src/warpSync/warpSyncShared.mjs";
import { loadChain } from "./chains.mjs";
import { checkSnapshotFiles } from "./check-files.mjs";
import {
  emptyManifest,
  keyOf,
  readManifest,
  sha256,
  writeContractChunks,
  writeManifest,
} from "./snapshot-format.mjs";

const chain = loadChain("matic");
// The contracts of matic, as build-snapshot.mjs writes them in the manifest.
const contracts = chain.contracts.map(
  ({ project, version, name, address, creationBlock }) => ({
    project,
    version,
    name,
    address,
    creationBlock,
  }),
);
// The two that have logs in the sample snapshot, and their creation blocks.
const contractOf = (name) =>
  contracts.find((contract) => keyOf(contract) === `Augur/turbo/${name}`);
const [A, B] = [contractOf("AMMFactory"), contractOf("FeePot")];
const a = A.creationBlock;
const b = B.creationBlock;
const labelOf = (contract, from, to) => `${keyOf(contract)} ${from}-${to}`;
const logOf = (block, index) => ({
  blockNumber: `0x${block.toString(16)}`,
  logIndex: `0x${index.toString(16)}`,
  data: "0x",
  topics: ["0x01"],
});

let dir;
let chainDir;
let manifestFile;
// A snapshot of matic without problems: A has the logs of its first three
// blocks in two files and no log after; B has one file.
beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-files-"));
  chainDir = path.join(dir, "matic");
  manifestFile = path.join(chainDir, "manifest.json");
  const manifest = emptyManifest(chain);
  manifest.contracts = contracts;
  const ranges = [
    [A, a + 9, [logOf(a, 0), logOf(a + 1, 0), logOf(a + 2, 0)]],
    [B, b + 5, [logOf(b + 1, 0)]],
  ];
  for (const [contract, toBlock, logs] of ranges) {
    manifest.chunks.push(
      ...(await writeContractChunks({
        chainId: chain.chainId,
        contract,
        fromBlock: contract.creationBlock,
        toBlock,
        logs,
        outDir: chainDir,
        maxLogs: 2,
      })),
    );
  }
  writeManifest(manifestFile, manifest);
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const check = () => checkSnapshotFiles(dir, ["matic"]);
const change = (edit) => {
  const manifest = readManifest(manifestFile, chain);
  edit(manifest);
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
};
const firstFile = () => readManifest(manifestFile, chain).chunks[0].file;
// A problem of the file of chunk i (the files are not changed by change()).
const fileProblem = (i, text) =>
  `matic: ${path.join(chainDir, readManifest(manifestFile, chain).chunks[i].file)} ${text}`;

describe("checkSnapshotFiles", () => {
  test("finds no problem in the snapshot of the repository", () => {
    const start = Date.now();
    expect(
      checkSnapshotFiles("static/warp-sync", WARP_SYNC_CHAIN_NAMES),
    ).toEqual([]);
    console.log(`static/warp-sync: checked in ${Date.now() - start} ms`);
  }, 120_000);

  test("finds no problem in a good snapshot", () => {
    const { chunks } = readManifest(manifestFile, chain);
    // Two files of A, a range of A without logs, and one file of B.
    expect(chunks.map((c) => [c.name, c.fromBlock, c.toBlock])).toEqual([
      [A.name, a, a + 1],
      [A.name, a + 2, a + 9],
      [B.name, b, b + 5],
    ]);
    expect(check()).toEqual([]);
  });

  test("a snapshot of a chain that is not in the list", () => {
    const file = path.join(dir, "eth", "manifest.json");
    fs.mkdirSync(path.dirname(file));
    fs.writeFileSync(file, "{}");
    expect(check()).toEqual([
      `${file} is of a chain that is not in WARP_SYNC_CHAIN_NAMES.`,
    ]);
  });

  test("a folder of the snapshot that does not exist", () => {
    const missing = path.join(dir, "none");
    expect(checkSnapshotFiles(missing, ["matic"])).toEqual([
      `matic: no ${path.join(missing, "matic", "manifest.json")}.`,
    ]);
  });

  test("an empty list of chains", () => {
    expect(checkSnapshotFiles(dir, [])).toEqual(["No chain to check."]);
  });

  test("a chain in the list without a manifest", () => {
    fs.rmSync(manifestFile);
    expect(check()).toEqual([`matic: no ${manifestFile}.`]);
  });

  test("another chainId", () => {
    change((m) => (m.chainId = 1));
    expect(check()).toEqual([`matic: ${manifestFile} is for chainId 1.`]);
  });

  test("a missing file", () => {
    const file = path.join(chainDir, firstFile());
    fs.rmSync(file);
    expect(check()).toEqual([`matic: ${labelOf(A, a, a + 1)}: no ${file}.`]);
  });

  test("another size", () => {
    change((m) => (m.chunks[0].bytes += 1));
    const problems = check();
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/ bytes, not /);
    expect(problems[1]).toMatch(/^matic: totals\.bytes is /);
  });

  test("another sha256", () => {
    change((m) => (m.chunks[0].sha256 = "0".repeat(64)));
    const file = path.join(chainDir, firstFile());
    expect(check()).toEqual([`matic: ${file} does not match its sha256.`]);
  });

  test("two chunks with the same file", () => {
    const { chunks } = readManifest(manifestFile, chain);
    change((m) => (m.chunks[1].file = chunks[0].file));
    expect(check()).toEqual([
      `matic: ${labelOf(A, a + 2, a + 9)}: ${chunks[0].file} is the file of another chunk.`,
      `matic: ${path.join(chainDir, chunks[1].file)} is not in the manifest.`,
    ]);
  });

  test("a file for a range without logs, and no file for logs", () => {
    change((m) => {
      m.chunks[1].logCount = 0;
      m.chunks[1].file = "x.json.gz";
      m.chunks[2].file = null;
    });
    const problems = check();
    expect(problems).toContain(
      `matic: ${labelOf(A, a + 2, a + 9)} has 0 logs and file x.json.gz.`,
    );
    expect(problems).toContain(
      `matic: ${labelOf(B, b, b + 5)} has 1 logs and file null.`,
    );
  });

  test("a gap", () => {
    change((m) => (m.chunks[1].fromBlock = a + 3));
    expect(check()).toEqual([
      fileProblem(1, `has blocks ${a + 2}-${a + 9}, not ${a + 3}-${a + 9}.`),
      fileProblem(1, `has a log of block ${a + 2}.`),
      `matic: ${labelOf(A, a + 3, a + 9)} does not start at block ${a + 2}.`,
    ]);
  });

  test("a first fromBlock that is not the creationBlock", () => {
    change(
      (m) =>
        (m.contracts.find((c) => keyOf(c) === keyOf(B)).creationBlock = b - 1),
    );
    const key = keyOf(B);
    expect(check()).toEqual([
      `matic: ${key} has creationBlock ${b - 1}, not ${b}.`,
      `matic: ${labelOf(B, b, b + 5)} does not start at block ${b - 1}.`,
    ]);
  });

  test("a range without blocks", () => {
    change((m) => {
      m.chunks[1].toBlock = a + 1;
      m.chunks[1].fromBlock = a + 2;
    });
    expect(check()).toEqual([
      fileProblem(1, `has blocks ${a + 2}-${a + 9}, not ${a + 2}-${a + 1}.`),
      fileProblem(1, `has a log of block ${a + 2}.`),
      `matic: ${labelOf(A, a + 2, a + 1)} has no block.`,
    ]);
  });

  test("a range that ends at the creation block", () => {
    change((m) => {
      m.chunks[0].toBlock = a;
      m.chunks[1].fromBlock = a + 1;
    });
    expect(check()).toEqual([
      fileProblem(0, `has blocks ${a}-${a + 1}, not ${a}-${a}.`),
      fileProblem(0, `has a log of block ${a + 1}.`),
      fileProblem(1, `has blocks ${a + 2}-${a + 9}, not ${a + 1}-${a + 9}.`),
      `matic: ${labelOf(A, a, a)} ends at the creation block.`,
    ]);
  });

  test("a chunk of a contract that is not in manifest.contracts", () => {
    change(
      (m) => (m.contracts = m.contracts.filter((c) => keyOf(c) !== keyOf(B))),
    );
    const key = keyOf(B);
    expect(check()).toEqual([
      `matic: ${key} is not in manifest.contracts.`,
      `matic: ${labelOf(B, b, b + 5)}: ${key} is not in manifest.contracts.`,
    ]);
  });

  test("a contract of another address than in the chain", () => {
    change(
      (m) =>
        (m.contracts.find((c) => keyOf(c) === keyOf(A)).address = B.address),
    );
    const key = keyOf(A);
    expect(check()).toEqual([
      `matic: ${key} has address ${B.address}, not ${A.address}.`,
      fileProblem(0, `has address ${A.address}, not ${B.address}.`),
      fileProblem(1, `has address ${A.address}, not ${B.address}.`),
    ]);
  });

  test("a contract that the chain does not have", () => {
    change((m) => m.contracts.push({ ...A, name: "Other" }));
    expect(check()).toEqual([
      `matic: ${A.project}/${A.version}/Other is not a contract with events of the chain.`,
    ]);
  });

  // Writes the file of chunk 0 again with edit, with its new size and sha256
  // in the manifest, as build-snapshot.mjs would have.
  const writeFirstFile = (edit) => {
    const manifest = readManifest(manifestFile, chain);
    const chunk = manifest.chunks[0];
    const file = path.join(chainDir, chunk.file);
    const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString());
    edit(data);
    const text = JSON.stringify(data);
    const gzip = zlib.gzipSync(text);
    fs.writeFileSync(file, gzip);
    chunk.bytes = gzip.length;
    chunk.sha256 = sha256(gzip);
    chunk.rawBytes = Buffer.byteLength(text);
    chunk.rawSha256 = sha256(text);
    writeManifest(manifestFile, manifest);
  };

  test.each([
    ["another format", (d) => (d.formatVersion = 2), "has formatVersion 2."],
    ["another chain", (d) => (d.chainId = 1), "is for chainId 1."],
    [
      "another contract",
      (d) => (d.name = B.name),
      `is of ${A.project}/${A.version}/${B.name}.`,
    ],
    [
      "another address",
      (d) => (d.address = B.address),
      `has address ${B.address}, not ${A.address}.`,
    ],
    [
      "another range",
      (d) => (d.toBlock = a + 2),
      `has blocks ${a}-${a + 2}, not ${a}-${a + 1}.`,
    ],
    ["another number of logs", (d) => d.logs.pop(), "has 1 logs, not 2."],
    [
      "two logs swapped",
      (d) => d.logs.reverse(),
      `has a log out of order at block ${a}, log index 0.`,
    ],
    [
      "a log twice",
      (d) => (d.logs[1] = d.logs[0]),
      `has a log out of order at block ${a}, log index 0.`,
    ],
    [
      "a log without a log index",
      (d) => delete d.logs[1].logIndex,
      `has a log with block 0x${(a + 1).toString(16)} and log index undefined.`,
    ],
    [
      "a log out of the range",
      (d) => (d.logs[1].blockNumber = `0x${(a + 2).toString(16)}`),
      `has a log of block ${a + 2}.`,
    ],
  ])("a file with %s", (_, edit, text) => {
    writeFirstFile(edit);
    expect(check()).toEqual([fileProblem(0, text)]);
  });

  test("another size or sha256 of the JSON", () => {
    change((m) => {
      m.chunks[0].rawBytes += 1;
      m.chunks[0].rawSha256 = "0".repeat(64);
      m.totals.rawBytes += 1;
    });
    const raw = readManifest(manifestFile, chain).chunks[0].rawBytes;
    expect(check()).toEqual([
      fileProblem(0, `has ${raw - 1} bytes of JSON, not ${raw}.`),
      fileProblem(0, "does not match its rawSha256."),
    ]);
  });

  // Three logs in the file of chunk 0, which has the blocks a and a + 1.
  const writeThreeLogs = (blocks) => {
    writeFirstFile((d) => {
      d.logs = blocks.map((block) => ({
        ...d.logs[0],
        blockNumber: `0x${block.toString(16)}`,
      }));
    });
    change((m) => {
      m.chunks[0].logCount = 3;
      m.totals.logCount += 1;
    });
  };

  test("a file with a log out of the range and logs out of order", () => {
    writeThreeLogs([a + 1, a + 5, a]);
    expect(check()).toEqual([
      fileProblem(0, `has a log of block ${a + 5}.`),
      fileProblem(0, `has a log out of order at block ${a}, log index 0.`),
    ]);
  });

  test("a log out of the range does not make the next one out of order", () => {
    writeThreeLogs([a, a + 5, a + 1]);
    expect(check()).toEqual([fileProblem(0, `has a log of block ${a + 5}.`)]);
  });

  test("a file that is not gzip", () => {
    const manifest = readManifest(manifestFile, chain);
    const chunk = manifest.chunks[0];
    const data = Buffer.from("not gzip");
    fs.writeFileSync(path.join(chainDir, chunk.file), data);
    chunk.bytes = data.length;
    chunk.sha256 = sha256(data);
    writeManifest(manifestFile, manifest);
    const problems = check();
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/ cannot be read: /);
  });

  test("other totals", () => {
    change((m) => (m.totals.logCount += 1));
    expect(check()).toEqual(["matic: totals.logCount is 5, not 4."]);
  });

  test("a file that is not in the manifest, but not under .partial/", () => {
    fs.writeFileSync(path.join(chainDir, "x.json.gz"), "");
    fs.mkdirSync(path.join(chainDir, ".partial"));
    fs.writeFileSync(path.join(chainDir, ".partial", "y.json.gz"), "");
    expect(check()).toEqual([
      `matic: ${path.join(chainDir, "x.json.gz")} is not in the manifest.`,
    ]);
  });
});
