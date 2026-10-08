// Checks the files of the warp sync snapshot against their manifest.json, for
// check-files.test.mjs: it runs on every PR and in the release. See README.md.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { loadChain } from "./build-snapshot.mjs";
import {
  FORMAT_VERSION,
  isAfter,
  keyOf,
  logPositionOf,
  readManifest,
  readText,
  sha256,
  totalsOf,
} from "./snapshot-format.mjs";

// Reads WARP_SYNC_CHAIN_NAMES like build-snapshot.mjs reads the _index.ts
// files. Returns [] when the line is not found.
export function readWarpSyncChainNames(file = "src/warpSync/warpSyncState.ts") {
  const found = readText(file).match(
    /WARP_SYNC_CHAIN_NAMES[^=]*=\s*\[([^\]]*)\]/,
  );
  if (!found) return [];
  return [...found[1].matchAll(/"([^"]+)"/g)].map((name) => name[1]);
}

// The app checks the sha256 (of the gzip, or of the JSON when the server sends
// it decoded), the format, the key and the range of a file, but not its logs
// (warpSyncFile.ts), so a file that build-snapshot.mjs wrote wrong would be
// imported. contract: the one of the chunk in manifest.contracts, if any.
function contentProblems(data, chunk, chainId, contract) {
  let text;
  let file;
  try {
    text = zlib.gunzipSync(data);
    file = JSON.parse(text.toString());
  } catch (e) {
    return [`cannot be read: ${e.message}`];
  }
  const problems = [];
  if (text.length !== chunk.rawBytes) {
    problems.push(`has ${text.length} bytes of JSON, not ${chunk.rawBytes}.`);
  }
  if (sha256(text) !== chunk.rawSha256) {
    problems.push("does not match its rawSha256.");
  }
  if (file.formatVersion !== FORMAT_VERSION) {
    problems.push(`has formatVersion ${file.formatVersion}.`);
  }
  if (file.chainId !== chainId) {
    problems.push(`is for chainId ${file.chainId}.`);
  }
  if (keyOf(file) !== keyOf(chunk)) {
    problems.push(`is of ${keyOf(file)}.`);
  }
  if (
    contract &&
    String(file.address).toLowerCase() !== contract.address.toLowerCase()
  ) {
    problems.push(`has address ${file.address}, not ${contract.address}.`);
  }
  if (file.fromBlock !== chunk.fromBlock || file.toBlock !== chunk.toBlock) {
    problems.push(
      `has blocks ${file.fromBlock}-${file.toBlock}, not ${chunk.fromBlock}-${chunk.toBlock}.`,
    );
  }
  if (!Array.isArray(file.logs) || file.logs.length !== chunk.logCount) {
    problems.push(`has ${file.logs?.length} logs, not ${chunk.logCount}.`);
    return problems;
  }
  // In the range and in the order that writeContractChunks writes them: the
  // first log of each kind of problem.
  const found = new Map();
  let last;
  for (const log of file.logs) {
    const position = logPositionOf(log);
    if (!position) {
      if (!found.has("position")) {
        found.set(
          "position",
          `has a log with block ${log?.blockNumber} and log index ${log?.logIndex}.`,
        );
      }
      continue;
    }
    const [block, index] = position;
    if (
      (block < chunk.fromBlock || block > chunk.toBlock) &&
      !found.has("range")
    ) {
      found.set("range", `has a log of block ${block}.`);
    }
    if (!isAfter(position, last) && !found.has("order")) {
      found.set(
        "order",
        `has a log out of order at block ${block}, log index ${index}.`,
      );
    }
    last = position;
  }
  return [...problems, ...found.values()];
}

// Returns the problems of the snapshot of each chain under dir.
export function checkSnapshotFiles(dir, chainNames) {
  if (chainNames.length === 0) return ["No chain to check."];
  // The app imports only the chains of WARP_SYNC_CHAIN_NAMES: a snapshot of
  // another chain would not be used, without a word.
  const entries = fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true })
    : [];
  const others = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !chainNames.includes(entry.name) &&
        fs.existsSync(path.join(dir, entry.name, "manifest.json")),
    )
    .map(
      (entry) =>
        `${path.join(dir, entry.name, "manifest.json")} is of a chain that is not in WARP_SYNC_CHAIN_NAMES.`,
    );
  return [
    ...others,
    ...chainNames.flatMap((name) => checkChain(path.join(dir, name), name)),
  ];
}

function checkChain(dir, name) {
  const file = path.join(dir, "manifest.json");
  // readManifest returns an empty manifest for a missing file.
  if (!fs.existsSync(file)) return [`${name}: no ${file}.`];
  let chain;
  let manifest;
  try {
    chain = loadChain(name);
    manifest = readManifest(file, chain);
  } catch (e) {
    return [`${name}: ${e.message}`];
  }
  const problems = [];
  const problem = (text) => problems.push(`${name}: ${text}`);

  // The app imports a contract only when it has events and the same address
  // and creation block (matchWarpSyncContracts of warpSyncPlan.ts), and skips
  // the others without a word.
  const appContracts = new Map(chain.contracts.map((c) => [keyOf(c), c]));
  const manifestContracts = new Map(
    manifest.contracts.map((c) => [keyOf(c), c]),
  );
  for (const contract of manifest.contracts) {
    const key = keyOf(contract);
    const appContract = appContracts.get(key);
    if (!appContract) {
      problem(`${key} is not a contract with events of the chain.`);
      continue;
    }
    if (contract.address.toLowerCase() !== appContract.address.toLowerCase()) {
      problem(
        `${key} has address ${contract.address}, not ${appContract.address}.`,
      );
    }
    if (contract.creationBlock !== appContract.creationBlock) {
      problem(
        `${key} has creationBlock ${contract.creationBlock}, not ${appContract.creationBlock}.`,
      );
    }
  }
  for (const key of appContracts.keys()) {
    if (!manifestContracts.has(key)) {
      problem(`${key} is not in manifest.contracts.`);
    }
  }

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
      continue;
    }
    const contract = manifestContracts.get(keyOf(chunk));
    for (const text of contentProblems(
      data,
      chunk,
      manifest.chainId,
      contract,
    )) {
      problem(`${chunkFile} ${text}`);
    }
  }

  // The app imports the chunks of a contract in this order, and stops the
  // contract at a gap (getRangeAction of warpSyncPlan.ts).
  const nextBlocks = new Map();
  for (const chunk of manifest.chunks) {
    const key = keyOf(chunk);
    const label = `${key} ${chunk.fromBlock}-${chunk.toBlock}`;
    const contract = manifestContracts.get(key);
    if (!contract) {
      problem(`${label}: ${key} is not in manifest.contracts.`);
      continue;
    }
    const nextBlock = nextBlocks.get(key) ?? contract.creationBlock;
    if (chunk.fromBlock !== nextBlock) {
      problem(`${label} does not start at block ${nextBlock}.`);
    }
    if (chunk.fromBlock > chunk.toBlock) problem(`${label} has no block.`);
    // The app takes a fetchedBlockNumber at the creation block for "nothing
    // fetched" (getNextBlock of warpSyncPlan.ts): it would fetch that block
    // again, and skip the next range.
    if (chunk.toBlock === contract.creationBlock) {
      problem(`${label} ends at the creation block.`);
    }
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
