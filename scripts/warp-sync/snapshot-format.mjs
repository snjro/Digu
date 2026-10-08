// The files of the warp sync snapshot (formatVersion 3), shared by
// build-snapshot.mjs and convert-snapshot.mjs. See README.md.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export const FORMAT_VERSION = 3;
// The most logs in one file, unless one block has more. The app imports one
// file at a time, so a file stays small enough to read and save at once.
// Smaller only to check the scripts with few logs.
export const CHUNK_LOGS = chunkLogsOf(process.env.WARP_SYNC_CHUNK_LOGS);
export function chunkLogsOf(value) {
  if (value === undefined) return 20_000;
  const chunkLogs = Number(value);
  if (!/^\d+$/.test(value) || chunkLogs <= 0) {
    throw new Error(
      `WARP_SYNC_CHUNK_LOGS must be a positive integer, not "${value}".`,
    );
  }
  return chunkLogs;
}

export const keyOf = (contract) =>
  `${contract.project}/${contract.version}/${contract.name}`;

export const chunkFileName = (contract, toBlock) =>
  `${contract.project}-${contract.version}-${contract.name}-${toBlock}.json.gz`;

export const sha256 = (data) =>
  crypto.createHash("sha256").update(data).digest("hex");

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
    const block = Number(log.blockNumber);
    const index = Number(log.logIndex);
    if (block < fromBlock || block > toBlock) {
      throw new Error(
        `${keyOf(contract)}: a log of block ${block} is out of ${fromBlock}-${toBlock}.`,
      );
    }
    if (last && (block < last[0] || (block === last[0] && index <= last[1]))) {
      throw new Error(
        `${keyOf(contract)}: the logs are not in order at block ${block}, log index ${index}.`,
      );
    }
    // Cut only between blocks, so that a block is in one file.
    if (buffer.length >= maxLogs && block !== last[0]) flush(last[0]);
    buffer.push(log);
    last = [block, index];
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

// The text of a text file that these scripts read, without a byte order mark,
// which would hide the first import of an _index.ts and break JSON.parse.
export function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

export function readManifest(file, chain) {
  if (!fs.existsSync(file)) return emptyManifest(chain);
  const manifest = JSON.parse(readText(file));
  if (manifest.formatVersion === 2) {
    throw new Error(
      `${file} has formatVersion 2. Convert it first with scripts/warp-sync/convert-snapshot.mjs.`,
    );
  }
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
// when its removal fails, after a stop (a kill) before the rename, and by a
// write that returns a promise (a misuse: it is not waited for, and writeWhole
// throws).
export function writeWhole(file, write) {
  const tmp = `${file}.tmp`;
  let written;
  try {
    written = write(tmp);
  } catch (error) {
    discard(tmp);
    throw error;
  }
  if (typeof written?.then === "function") {
    // A misuse, which no caller makes: tmp is left as it is, since the write
    // goes on. Only its rejection is caught, so that it is not unhandled.
    written.then(undefined, () => {});
    throw new TypeError(
      "The write of writeWhole returned a promise: use writeWholeAsync.",
    );
  }
  replace(tmp, file);
}
// writeWhole for a write that returns a promise, which is waited for.
export async function writeWholeAsync(file, write) {
  const tmp = `${file}.tmp`;
  try {
    await write(tmp);
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
