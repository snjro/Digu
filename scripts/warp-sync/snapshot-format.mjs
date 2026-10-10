// The files of the warp sync snapshot (formatVersion 3). See README.md.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {
  getWarpSyncKey as keyOf,
  WARP_SYNC_FORMAT_VERSION as FORMAT_VERSION,
} from "../../src/warpSync/warpSyncShared.mjs";

export { FORMAT_VERSION, keyOf };
// The most logs in one file, unless one block has more. The app imports one
// file at a time, so a file stays small enough to read and save at once.
export const CHUNK_LOGS = 20_000;

export const chunkFileName = (contract, toBlock) =>
  `${contract.project}-${contract.version}-${contract.name}-${toBlock}.json.gz`;

export const sha256 = (data) =>
  crypto.createHash("sha256").update(data).digest("hex");

// The block and the log index of a log, as numbers, or undefined when one is
// not a hex quantity: the form of the RPC, which toSnapshotLog keeps.
const HEX_QUANTITY = /^0x[0-9a-fA-F]+$/;
export const isHexQuantity = (value) =>
  typeof value === "string" && HEX_QUANTITY.test(value);
export function logPositionOf(log) {
  return isHexQuantity(log?.blockNumber) && isHexQuantity(log?.logIndex)
    ? [Number(log.blockNumber), Number(log.logIndex)]
    : undefined;
}
// Whether a log at position comes after the one at last in a file of the
// snapshot: by block and log index, each log once.
export function isAfter(position, last) {
  return (
    last === undefined ||
    position[0] > last[0] ||
    (position[0] === last[0] && position[1] > last[1])
  );
}

// Writes the logs of one contract from fromBlock to toBlock into files of at
// most maxLogs logs, cut between blocks, under outDir. logs is an iterable
// (or async iterable) of the logs of the snapshot, by block and log index.
// Returns the rows of manifest.chunks, in the order of the blocks: a range
// without logs has no file.
export async function writeContractChunks({
  chainId,
  contract,
  fromBlock,
  toBlock,
  logs,
  outDir,
  maxLogs = CHUNK_LOGS,
}) {
  const rows = [];
  let from = fromBlock;
  let buffer = [];
  let last = undefined; // [blockNumber, logIndex] of the last log
  const flush = (to) => {
    const row = {
      project: contract.project,
      version: contract.version,
      name: contract.name,
      fromBlock: from,
      toBlock: to,
      logCount: buffer.length,
      file: null,
    };
    if (buffer.length > 0) {
      const text = JSON.stringify({
        formatVersion: FORMAT_VERSION,
        chainId,
        project: contract.project,
        version: contract.version,
        name: contract.name,
        address: contract.address,
        fromBlock: from,
        toBlock: to,
        logs: buffer,
      });
      const gzip = zlib.gzipSync(text, { level: 6 });
      row.file = chunkFileName(contract, to);
      row.bytes = gzip.length;
      row.rawBytes = Buffer.byteLength(text);
      row.sha256 = sha256(gzip);
      row.rawSha256 = sha256(text);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, row.file), gzip);
    }
    rows.push(row);
    from = to + 1;
    buffer = [];
  };
  for await (const log of logs) {
    const position = logPositionOf(log);
    if (!position) {
      throw new Error(
        `${keyOf(contract)}: a log with block ${log?.blockNumber} and log index ${log?.logIndex}.`,
      );
    }
    const [block, index] = position;
    if (block < fromBlock || block > toBlock) {
      throw new Error(
        `${keyOf(contract)}: a log of block ${block} is out of ${fromBlock}-${toBlock}.`,
      );
    }
    if (!isAfter(position, last)) {
      throw new Error(
        `${keyOf(contract)}: the logs are not in order at block ${block}, log index ${index}.`,
      );
    }
    // Cut only between blocks, so that a block is in one file.
    if (buffer.length >= maxLogs && block !== last[0]) flush(last[0]);
    buffer.push(log);
    last = position;
  }
  // The rest of the range, with or without logs.
  if (buffer.length > 0 || from <= toBlock) flush(toBlock);
  return rows;
}

export function totalsOf(chunks) {
  const totals = { logCount: 0, bytes: 0, rawBytes: 0 };
  for (const chunk of chunks) {
    totals.logCount += chunk.logCount;
    totals.bytes += chunk.bytes ?? 0;
    totals.rawBytes += chunk.rawBytes ?? 0;
  }
  return totals;
}

// The last block in the snapshot for each contract.
export function lastBlocks(manifest) {
  const last = new Map();
  for (const chunk of manifest.chunks) {
    const key = keyOf(chunk);
    last.set(key, Math.max(last.get(key) ?? -Infinity, chunk.toBlock));
  }
  return last;
}

// How the contracts of the manifest differ from those with events of the
// chain. The app imports a contract only when it has events and the same
// address and creation block (matchWarpSyncContracts of warpSyncPlan.ts), and
// skips the others without a word. notImported: the problems of the contracts
// of the manifest that the app does not import; missing: those of the
// contracts of the chain that the manifest does not have. Each problem is
// { key, text }.
export function compareContracts(chain, manifest) {
  const notImported = [];
  const missing = [];
  const appContracts = new Map(chain.contracts.map((c) => [keyOf(c), c]));
  const manifestContracts = new Map(
    manifest.contracts.map((c) => [keyOf(c), c]),
  );
  for (const contract of manifest.contracts) {
    const key = keyOf(contract);
    const appContract = appContracts.get(key);
    if (!appContract) {
      notImported.push({
        key,
        text: `${key} is not a contract with events of the chain.`,
      });
      continue;
    }
    if (contract.address.toLowerCase() !== appContract.address.toLowerCase()) {
      notImported.push({
        key,
        text: `${key} has address ${contract.address}, not ${appContract.address}.`,
      });
    }
    if (contract.creationBlock !== appContract.creationBlock) {
      notImported.push({
        key,
        text: `${key} has creationBlock ${contract.creationBlock}, not ${appContract.creationBlock}.`,
      });
    }
  }
  for (const key of appContracts.keys()) {
    if (!manifestContracts.has(key)) {
      missing.push({ key, text: `${key} is not in manifest.contracts.` });
    }
  }
  return { notImported, missing };
}

export function emptyManifest(chain) {
  return {
    formatVersion: FORMAT_VERSION,
    chainName: chain.name,
    chainId: chain.chainId,
    contracts: [],
    runs: [],
    chunks: [],
    totals: totalsOf([]),
  };
}

// The text of a file read whole, without a byte order mark, which would break
// JSON.parse or hide the first import of an _index.ts.
export function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

export function readManifest(file, chain) {
  if (!fs.existsSync(file)) return emptyManifest(chain);
  const manifest = JSON.parse(readText(file));
  if (manifest.formatVersion !== FORMAT_VERSION) {
    throw new Error(`${file} has formatVersion ${manifest.formatVersion}.`);
  }
  if (manifest.chainId !== chain.chainId) {
    throw new Error(`${file} is for chainId ${manifest.chainId}.`);
  }
  return manifest;
}

// Writes file whole and then renames it, so that a stop does not leave half a
// file: write(tmp) writes the file tmp. When the write or the rename fails, tmp
// is removed, file stays as it was, and the error is thrown. <file>.tmp is left
// when its removal fails, and after a stop (a kill) before the rename.
export function writeWhole(file, write) {
  const tmp = `${file}.tmp`;
  try {
    write(tmp);
  } catch (error) {
    discard(tmp);
    throw error;
  }
  replace(tmp, file);
}
// Removes tmp. A failure here is not thrown, so that it does not hide the
// error that made the write stop.
function discard(tmp) {
  try {
    fs.rmSync(tmp, { force: true });
  } catch {
    // The error of the write is thrown instead.
  }
}
function replace(tmp, file) {
  try {
    fs.renameSync(tmp, file);
  } catch (error) {
    discard(tmp);
    throw error;
  }
}

export function writeManifest(file, manifest) {
  manifest.totals = totalsOf(manifest.chunks);
  // .gitignore ignores the manifest.json.tmp of a stop only in
  // static/warp-sync/, the default --out.
  writeWhole(file, (tmp) =>
    fs.writeFileSync(tmp, `${JSON.stringify(manifest, null, 2)}\n`),
  );
}

// Moves the files written in fromDir to dir, after checking that none of them
// is there already or in the manifest: another run to the same block would
// overwrite a file, and its sha256 in the manifest would not match any more.
export function moveChunkFiles(rows, fromDir, dir, manifest) {
  const known = new Set(manifest.chunks.map((chunk) => chunk.file));
  const files = rows.map((row) => row.file).filter((file) => file !== null);
  for (const file of files) {
    if (known.has(file) || fs.existsSync(path.join(dir, file))) {
      throw new Error(`${path.join(dir, file)} is there already.`);
    }
  }
  fs.mkdirSync(dir, { recursive: true });
  for (const file of files) {
    fs.renameSync(path.join(fromDir, file), path.join(dir, file));
  }
}
