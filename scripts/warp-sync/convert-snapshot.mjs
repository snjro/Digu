// Converts the warp sync snapshot of a chain from formatVersion 2 to 3, in
// place: each file is replaced by a file of formatVersion 3 with the same
// name and logs, decoded with the ABIs of src/constants/chains. It sends
// nothing. See README.md.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import zlib from "node:zlib";
import { loadChain } from "./build-snapshot.mjs";
import {
  FORMAT_VERSION,
  keyOf,
  sha256,
  writeContractChunks,
  writeManifest,
} from "./snapshot-format.mjs";
import { toSnapshotLog } from "./snapshot-log.mjs";

export async function convertSnapshot({ dir, log }) {
  const manifestFile = path.join(dir, "manifest.json");
  const old = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  if (old.formatVersion !== 2) {
    throw new Error(`${manifestFile} has formatVersion ${old.formatVersion}.`);
  }
  const chain = loadChain(old.chainName);
  if (chain.chainId !== old.chainId) {
    throw new Error(`${manifestFile} is for chainId ${old.chainId}.`);
  }
  const contracts = new Map(chain.contracts.map((c) => [keyOf(c), c]));
  const manifest = { ...old, formatVersion: FORMAT_VERSION, chunks: [] };
  // The new files are written here and moved over the old ones only after
  // every file is converted.
  const tmpDir = path.join(dir, ".convert");
  fs.rmSync(tmpDir, { recursive: true, force: true });
  for (const chunk of old.chunks) {
    if (chunk.file === null) {
      manifest.chunks.push(chunk);
      continue;
    }
    const gzip = fs.readFileSync(path.join(dir, chunk.file));
    if (sha256(gzip) !== chunk.sha256) {
      throw new Error(`The sha256 of ${chunk.file} does not match.`);
    }
    const data = JSON.parse(zlib.gunzipSync(gzip).toString());
    if (
      data.formatVersion !== 2 ||
      data.chainId !== old.chainId ||
      keyOf(data) !== keyOf(chunk) ||
      data.fromBlock !== chunk.fromBlock ||
      data.toBlock !== chunk.toBlock ||
      data.logs.length !== chunk.logCount
    ) {
      throw new Error(`${chunk.file} does not match the manifest.`);
    }
    const contract = contracts.get(keyOf(chunk));
    if (!contract) {
      throw new Error(`${keyOf(chunk)} of ${chunk.file} is not in the chain.`);
    }
    const rows = await writeContractChunks({
      chainId: old.chainId,
      contract: { ...contract, address: data.address },
      fromBlock: chunk.fromBlock,
      toBlock: chunk.toBlock,
      logs: data.logs.map((raw) =>
        toSnapshotLog(contract, raw, raw.blockTimestamp),
      ),
      outDir: tmpDir,
      // One file, as before.
      maxLogs: Infinity,
    });
    if (
      rows.length !== 1 ||
      rows[0].file !== chunk.file ||
      rows[0].logCount !== chunk.logCount
    ) {
      throw new Error(`${chunk.file} did not become one file of its logs.`);
    }
    const { bytes, rawBytes, sha256: gzipSha256, rawSha256 } = rows[0];
    manifest.chunks.push({
      ...chunk,
      bytes,
      rawBytes,
      sha256: gzipSha256,
      rawSha256,
    });
  }
  for (const chunk of manifest.chunks) {
    if (chunk.file === null) continue;
    fs.renameSync(path.join(tmpDir, chunk.file), path.join(dir, chunk.file));
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  writeManifest(manifestFile, manifest);
  const written = manifest.chunks.filter((chunk) => chunk.file !== null);
  log(
    `Converted ${manifest.totals.logCount} logs in ${written.length} files in ${dir}.`,
  );
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({
    options: {
      chain: { type: "string" },
      out: { type: "string", default: "static/warp-sync" },
    },
  });
  if (!values.chain) {
    console.error(
      "Usage: node scripts/warp-sync/convert-snapshot.mjs --chain <name> [--out <dir>]",
    );
    process.exit(2);
  }
  await convertSnapshot({
    dir: path.join(values.out, values.chain),
    log: (message) => console.log(message),
  });
}
