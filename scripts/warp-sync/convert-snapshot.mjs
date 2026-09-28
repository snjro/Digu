// Converts the warp sync snapshot of a chain from formatVersion 1 to 2, in
// place: the same logs, in the files of formatVersion 2. It sends nothing.
// See README.md.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  FORMAT_VERSION,
  keyOf,
  moveChunkFiles,
  writeContractChunks,
  writeManifest,
} from "./snapshot-format.mjs";

export async function convertSnapshot({ dir, log }) {
  const manifestFile = path.join(dir, "manifest.json");
  const old = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  if (old.formatVersion !== 1) {
    throw new Error(`${manifestFile} has formatVersion ${old.formatVersion}.`);
  }
  const addresses = new Map(old.contracts.map((c) => [keyOf(c), c.address]));
  const manifest = {
    formatVersion: FORMAT_VERSION,
    chainName: old.chainName,
    chainId: old.chainId,
    contracts: old.contracts,
    runs: [],
    chunks: [],
  };
  const tmpDir = path.join(dir, ".convert");
  fs.rmSync(tmpDir, { recursive: true, force: true });
  for (const chunk of old.chunks) {
    const text = fs.readFileSync(path.join(dir, chunk.file), "utf8");
    const sha256 = crypto.createHash("sha256").update(text).digest("hex");
    if (sha256 !== chunk.sha256) {
      throw new Error(`The sha256 of ${chunk.file} does not match.`);
    }
    const data = JSON.parse(text);
    if (data.formatVersion !== 1 || data.chainId !== old.chainId) {
      throw new Error(`${chunk.file} is not of formatVersion 1 of this chain.`);
    }
    for (const range of chunk.contracts) {
      const contract = data.contracts.find((c) => keyOf(c) === keyOf(range));
      if (!contract || contract.logs.length !== range.logCount) {
        throw new Error(
          `${chunk.file} does not have the logs of ${keyOf(range)}.`,
        );
      }
      const address = addresses.get(keyOf(range));
      if (!address) {
        throw new Error(
          `${keyOf(range)} of ${chunk.file} is not in the contracts of the manifest.`,
        );
      }
      manifest.chunks.push(
        ...(await writeContractChunks({
          chainId: old.chainId,
          contract: { ...range, address },
          fromBlock: range.fromBlock,
          toBlock: range.toBlock,
          logs: contract.logs,
          outDir: tmpDir,
        })),
      );
    }
    manifest.runs.push({
      createdAt: chunk.createdAt,
      latestBlockNumber: chunk.latestBlockNumber,
      toBlock: Math.max(...chunk.contracts.map((c) => c.toBlock)),
      logCount: chunk.logCount,
    });
  }
  const before = old.chunks.reduce((sum, chunk) => sum + chunk.logCount, 0);
  const after = manifest.chunks.reduce((sum, chunk) => sum + chunk.logCount, 0);
  if (before !== after) {
    throw new Error(`${after} logs after the conversion, not ${before}.`);
  }
  moveChunkFiles(manifest.chunks, tmpDir, dir, { chunks: [] });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  writeManifest(manifestFile, manifest);
  for (const chunk of old.chunks) fs.rmSync(path.join(dir, chunk.file));
  const written = manifest.chunks.filter((chunk) => chunk.file !== null);
  log(
    `Converted ${after} logs of ${old.chunks.length} files into ${written.length} files in ${dir}.`,
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
