// Checks the files of the warp sync snapshot against their manifest.json, for
// check-files.test.mjs: it runs on every PR and in the release. See README.md.
import fs from "node:fs";
import path from "node:path";
import { loadChain } from "./build-snapshot.mjs";
import { keyOf, readManifest, sha256, totalsOf } from "./snapshot-format.mjs";

// Reads WARP_SYNC_CHAIN_NAMES like build-snapshot.mjs reads the _index.ts
// files. Returns [] when the line is not found.
export function readWarpSyncChainNames(file = "src/warpSync/warpSyncState.ts") {
  const found = fs
    .readFileSync(file, "utf8")
    .match(/WARP_SYNC_CHAIN_NAMES[^=]*=\s*\[([^\]]*)\]/);
  if (!found) return [];
  return [...found[1].matchAll(/"([^"]+)"/g)].map((name) => name[1]);
}

// Returns the problems of the snapshot of each chain under dir.
export function checkSnapshotFiles(dir, chainNames) {
  if (chainNames.length === 0) return ["No chain to check."];
  return chainNames.flatMap((name) => checkChain(path.join(dir, name), name));
}

function checkChain(dir, name) {
  const file = path.join(dir, "manifest.json");
  // readManifest returns an empty manifest for a missing file.
  if (!fs.existsSync(file)) return [`${name}: no ${file}.`];
  let manifest;
  try {
    manifest = readManifest(file, loadChain(name));
  } catch (e) {
    return [`${name}: ${e.message}`];
  }
  const problems = [];
  const problem = (text) => problems.push(`${name}: ${text}`);

  const listed = new Set();
  for (const chunk of manifest.chunks) {
    const label = `${keyOf(chunk)} ${chunk.fromBlock}-${chunk.toBlock}`;
    if ((chunk.file === null) !== (chunk.logCount === 0)) {
      problem(`${label} has ${chunk.logCount} logs and file ${chunk.file}.`);
    }
    if (chunk.file === null) continue;
    if (listed.has(chunk.file)) {
      problem(`${label}: ${chunk.file} is the file of another chunk.`);
      continue;
    }
    listed.add(chunk.file);
    const chunkFile = path.join(dir, chunk.file);
    if (!fs.existsSync(chunkFile)) {
      problem(`${label}: no ${chunkFile}.`);
      continue;
    }
    // The manifest has the size and the hash of the gzip bytes.
    const data = fs.readFileSync(chunkFile);
    if (data.length !== chunk.bytes) {
      problem(`${chunkFile} has ${data.length} bytes, not ${chunk.bytes}.`);
    }
    if (sha256(data) !== chunk.sha256) {
      problem(`${chunkFile} does not match its sha256.`);
    }
  }

  // The app imports the chunks of a contract in this order, and stops the
  // contract at a gap (getRangeAction of warpSyncPlan.ts).
  const creationBlocks = new Map(
    manifest.contracts.map((contract) => [
      keyOf(contract),
      contract.creationBlock,
    ]),
  );
  const nextBlocks = new Map();
  for (const chunk of manifest.chunks) {
    const key = keyOf(chunk);
    const label = `${key} ${chunk.fromBlock}-${chunk.toBlock}`;
    if (!creationBlocks.has(key)) {
      problem(`${label}: ${key} is not in manifest.contracts.`);
      continue;
    }
    const nextBlock = nextBlocks.get(key) ?? creationBlocks.get(key);
    if (chunk.fromBlock !== nextBlock) {
      problem(`${label} does not start at block ${nextBlock}.`);
    }
    if (chunk.fromBlock > chunk.toBlock) problem(`${label} has no block.`);
    nextBlocks.set(key, chunk.toBlock + 1);
  }

  const totals = totalsOf(manifest.chunks);
  for (const field of Object.keys(totals)) {
    if (manifest.totals?.[field] !== totals[field]) {
      problem(
        `totals.${field} is ${manifest.totals?.[field]}, not ${totals[field]}.`,
      );
    }
  }

  // Not .partial/, where build-snapshot.mjs keeps the files of a stopped run.
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      entry.name.endsWith(".json.gz") &&
      !listed.has(entry.name)
    ) {
      problem(`${path.join(dir, entry.name)} is not in the manifest.`);
    }
  }
  return problems;
}
