import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { loadChain } from "./build-snapshot.mjs";
import { checkSnapshotFiles, readWarpSyncChainNames } from "./check-files.mjs";
import {
  emptyManifest,
  readManifest,
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
const [A, B] = [contracts[0], contracts[2]];
const a = A.creationBlock;
const b = B.creationBlock;
const labelOf = (contract, from, to) =>
  `${contract.project}/${contract.version}/${contract.name} ${from}-${to}`;
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

describe("checkSnapshotFiles", () => {
  test("finds no problem in the snapshot of the repository", () => {
    const names = readWarpSyncChainNames();
    expect(names.length).toBeGreaterThan(0);
    const start = Date.now();
    expect(checkSnapshotFiles("static/warp-sync", names)).toEqual([]);
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
      `matic: ${labelOf(A, a + 3, a + 9)} does not start at block ${a + 2}.`,
    ]);
  });

  test("a first fromBlock that is not the creationBlock", () => {
    change((m) => (m.contracts[2].creationBlock = b - 1));
    const key = labelOf(B, b, b + 5).split(" ")[0];
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
      `matic: ${labelOf(A, a + 2, a + 1)} has no block.`,
    ]);
  });

  test("a range that ends at the creation block", () => {
    change((m) => {
      m.chunks[0].toBlock = a;
      m.chunks[1].fromBlock = a + 1;
    });
    expect(check()).toEqual([
      `matic: ${labelOf(A, a, a)} ends at the creation block.`,
    ]);
  });

  test("a chunk of a contract that is not in manifest.contracts", () => {
    change((m) => m.contracts.splice(2, 1));
    const key = labelOf(B, b, b + 5).split(" ")[0];
    expect(check()).toEqual([
      `matic: ${key} is not in manifest.contracts.`,
      `matic: ${labelOf(B, b, b + 5)}: ${key} is not in manifest.contracts.`,
    ]);
  });

  test("a contract of another address than in the chain", () => {
    change((m) => (m.contracts[0].address = B.address));
    const key = labelOf(A, a, a).split(" ")[0];
    expect(check()).toEqual([
      `matic: ${key} has address ${B.address}, not ${A.address}.`,
    ]);
  });

  test("a contract that the chain does not have", () => {
    change((m) => m.contracts.push({ ...A, name: "Other" }));
    expect(check()).toEqual([
      `matic: ${A.project}/${A.version}/Other is not a contract with events of the chain.`,
    ]);
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

describe("readWarpSyncChainNames", () => {
  test("reads the list, or nothing when the line is not found", () => {
    const file = path.join(dir, "warpSyncState.ts");
    fs.writeFileSync(
      file,
      'export const WARP_SYNC_CHAIN_NAMES: readonly ChainName[] = ["matic", "eth"];\n',
    );
    expect(readWarpSyncChainNames(file)).toEqual(["matic", "eth"]);
    fs.writeFileSync(file, "export const CHAINS = [];\n");
    expect(readWarpSyncChainNames(file)).toEqual([]);
  });
});
