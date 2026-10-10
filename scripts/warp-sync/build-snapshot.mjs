// Builds the warp sync snapshot of a chain: the event logs of its contracts,
// fetched with eth_getLogs under the same conditions as the sync and decoded
// with their ABIs. Run it again to add the logs after the last snapshot. See
// README.md.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { WARP_SYNC_DIR } from "../../src/warpSync/warpSyncShared.mjs";
import { loadChain } from "./chains.mjs";
import {
  createFetchStats,
  createWidths,
  fetchLogs,
  MAX_WIDTH,
  MAX_WIDTHS,
  retryFailures,
  retryRate,
  splitParts,
} from "./fetch-logs.mjs";
import {
  PARTIAL_DIR,
  partFiles,
  partKeyOf,
  readParts,
  readStates,
  writeState,
} from "./partial.mjs";
import { createRpc } from "./rpc.mjs";
import {
  CHUNK_LOGS,
  chunkFileName,
  isHexQuantity,
  keyOf,
  lastBlocks,
  moveChunkFiles,
  readManifest,
  writeContractChunks,
  writeManifest,
} from "./snapshot-format.mjs";
import { toSnapshotLog } from "./snapshot-log.mjs";

// The blocks of each contract are split into parts of this many blocks, and
// DEFAULT_CONCURRENCY workers take the next part when they finish one (#586).
const DEFAULT_PART_BLOCKS = 500_000;
const DEFAULT_CONCURRENCY = 24;
// The files of the snapshot, written before they are moved next to the
// manifest.
const OUT_DIR = "out";

// Decodes the logs, by block and log index, into the logs of the snapshot. A
// log without blockTimestamp gets it from its block, with rpc from
// retryFailures.
async function* toSnapshotLogs(rpc, contract, rawLogs) {
  let timestamp = undefined; // [blockNumber, blockTimestamp] of the last block asked
  for await (const raw of rawLogs) {
    let blockTimestamp = raw.blockTimestamp;
    if (!blockTimestamp) {
      if (timestamp?.[0] !== raw.blockNumber) {
        const block = await rpc("eth_getBlockByNumber", [
          raw.blockNumber,
          false,
        ]);
        // null after the retries: the RPC does not have the block (#768). A
        // block without a hex timestamp would write logs without their block
        // time.
        if (!isHexQuantity(block?.timestamp)) {
          throw new Error(
            `${keyOf(contract)}: the RPC returned no block with a hex timestamp for block ${Number(raw.blockNumber)}, for the blockTimestamp of its logs.`,
          );
        }
        timestamp = [raw.blockNumber, block.timestamp];
      }
      blockTimestamp = timestamp[1];
    }
    yield toSnapshotLog(contract, raw, blockTimestamp);
  }
}

export async function buildSnapshot({
  chainName,
  rpcUrl,
  outDir,
  toBlock,
  maxRequests,
  concurrency = DEFAULT_CONCURRENCY,
  partBlocks = DEFAULT_PART_BLOCKS,
  maxWidth = undefined,
  chunkLogs = CHUNK_LOGS,
  log,
}) {
  const chain = loadChain(chainName);
  const rpc = createRpc(rpcUrl, maxRequests);
  const options = {
    concurrency,
    partBlocks,
    maxWidth: maxWidth ?? MAX_WIDTHS[chain.name] ?? MAX_WIDTH,
    chunkLogs,
    log,
  };
  try {
    return await build(chain, rpc, outDir, toBlock, options);
  } finally {
    log(`Requests: ${JSON.stringify(rpc.counts)}`);
  }
}

async function build(chain, rpc, outDir, toBlock, options) {
  const { concurrency, partBlocks, maxWidth, chunkLogs, log } = options;
  const stats = createFetchStats();
  // The requests other than eth_getLogs (#632: eth_blockNumber got HTTP 429).
  const ask = retryRate(rpc, { log, stats });
  const chainId = Number(await ask("eth_chainId"));
  if (chainId !== chain.chainId) {
    throw new Error(`The RPC is for chainId ${chainId}, not ${chain.chainId}.`);
  }
  const latest = Number(await ask("eth_blockNumber"));
  const goal = latest - chain.confirmationBlocks;

  const dir = path.join(outDir, chain.name);
  const partialDir = path.join(dir, PARTIAL_DIR);
  const states = readStates(partialDir);
  const partialEnds = new Set([...states.values()].map((s) => s.end));
  if (partialEnds.size > 1) {
    throw new Error(`${partialDir} has runs to different blocks.`);
  }
  const [partialEnd] = partialEnds;
  // A run that stopped goes on to the same block.
  const end = toBlock ?? partialEnd ?? goal;
  if (partialEnd !== undefined && end !== partialEnd) {
    throw new Error(
      `The run that stopped was to ${partialEnd}. Run it without --to, or with --to ${partialEnd}.`,
    );
  }
  if (end > goal) {
    throw new Error(
      `--to ${end} is above latest - confirmationBlocks (${goal}).`,
    );
  }

  const manifestFile = path.join(dir, "manifest.json");
  const manifest = readManifest(manifestFile, chain);
  const known = new Map(manifest.contracts.map((c) => [keyOf(c), c]));
  for (const contract of chain.contracts) {
    const before = known.get(keyOf(contract));
    if (
      before &&
      (before.address.toLowerCase() !== contract.address.toLowerCase() ||
        before.creationBlock !== contract.creationBlock)
    ) {
      throw new Error(
        `${keyOf(contract)} changed its address or creation block.`,
      );
    }
  }
  const last = lastBlocks(manifest);
  const plans = [];
  for (const contract of chain.contracts) {
    const lastBlock = last.get(keyOf(contract));
    const from =
      lastBlock === undefined ? contract.creationBlock : lastBlock + 1;
    if (from > end) continue;
    // Another run to the same block would overwrite the file of its last
    // logs. Stop before fetching.
    const file = chunkFileName(contract, end);
    if (fs.existsSync(path.join(dir, file))) {
      throw new Error(`${path.join(dir, file)} is there already.`);
    }
    plans.push({
      contract,
      from,
      parts: splitParts(from, end, partBlocks),
      widths: createWidths(maxWidth),
      // The .jsonl file of each part, in the order of the blocks.
      files: [],
    });
  }
  if (plans.length === 0) {
    fs.rmSync(partialDir, { recursive: true, force: true });
    log(`Nothing to add: the snapshot already reaches block ${end}.`);
    return undefined;
  }

  // The parts wait in a queue, the first part of each contract first, and
  // `concurrency` workers take the next part when they finish one, so that
  // the requests at a time stay the same until the end (#586). When one part
  // stops (at --max-requests, or after failures), the others stop before
  // their next request, and all keep what they fetched in .partial/.
  fs.mkdirSync(partialDir, { recursive: true });
  const controller = new AbortController();
  const queue = [];
  const most = Math.max(...plans.map((plan) => plan.parts.length));
  for (let i = 0; i < most; i++) {
    for (const plan of plans) {
      if (i < plan.parts.length) queue.push({ plan, index: i });
    }
  }
  const fetchPart = async ({ plan, index }) => {
    const { contract, from, widths } = plan;
    const [partFrom, partTo] = plan.parts[index];
    const part = {
      project: contract.project,
      version: contract.version,
      name: contract.name,
      end,
      fromBlock: from,
      partFrom,
      partTo,
    };
    const files = partFiles(partialDir, part);
    plan.files[index] = files.logs;
    const saved = states.get(partKeyOf(part));
    const logsSize = fs.statSync(files.logs, { throwIfNoEntry: false })?.size;
    // Why a part with a state cannot go on from it. truncateSync would fill a
    // shorter file with NUL bytes.
    const startOver =
      saved === undefined
        ? undefined
        : saved.size === undefined
          ? "its state has no size"
          : saved.fromBlock !== from
            ? `its state is from block ${saved.fromBlock}, not ${from}`
            : logsSize === undefined || logsSize < saved.size
              ? `its .jsonl file is missing or shorter than ${saved.size} bytes`
              : undefined;
    const resumed = startOver === undefined ? saved : undefined;
    const nextBlock = resumed?.nextBlock ?? partFrom;
    if (resumed) {
      // Drops what was added after the state: the logs of a range whose
      // state was not written, and a line half written.
      fs.truncateSync(files.logs, resumed.size);
    } else {
      if (startOver !== undefined) {
        log(
          `${keyOf(contract)} ${partFrom}-${partTo}: start over, since ${startOver}.`,
        );
      }
      // A state left beside a new file would make the next run go on from it.
      fs.rmSync(files.logs, { force: true });
      fs.rmSync(files.state, { force: true });
    }
    if (resumed && nextBlock <= partTo) {
      log(`${keyOf(contract)} ${partFrom}-${partTo}: go on from ${nextBlock}.`);
    }
    await fetchLogs(rpc, contract, nextBlock, partTo, {
      log,
      onRange: (_from, to, logs) => {
        // Stops at once at a log that toSnapshotLog does not take. .partial/
        // keeps the logs as the RPC returned them; they are checked and
        // decoded again when the files are written.
        for (const raw of logs)
          toSnapshotLog(contract, raw, raw.blockTimestamp);
        fs.appendFileSync(
          files.logs,
          logs.map((raw) => `${JSON.stringify(raw)}\n`).join(""),
        );
        writeState(files.state, {
          ...part,
          nextBlock: to + 1,
          size: fs.statSync(files.logs).size,
        });
      },
      signal: controller.signal,
      widths,
      stats,
    });
  };
  const worker = async () => {
    while (queue.length > 0 && !controller.signal.aborted) {
      await fetchPart(queue.shift());
    }
  };
  const results = await Promise.allSettled(
    Array.from({ length: Math.min(concurrency, queue.length) }, () =>
      worker().catch((error) => {
        controller.abort(error);
        throw error;
      }),
    ),
  );
  if (results.some((result) => result.status === "rejected")) {
    // The error of the part that stopped first.
    throw controller.signal.reason;
  }
  log(`Checks: ${JSON.stringify(stats)}`);

  // Writes the files one contract at a time, reading the logs of its parts
  // in the order of the blocks, so that the logs are not all in memory.
  const askBlock = retryFailures(ask, { log, stats });
  const tmpDir = path.join(partialDir, OUT_DIR);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  const rows = [];
  for (const { contract, from, files } of plans) {
    rows.push(
      ...(await writeContractChunks({
        chainId: chain.chainId,
        contract,
        fromBlock: from,
        toBlock: end,
        logs: toSnapshotLogs(askBlock, contract, readParts(files)),
        outDir: tmpDir,
        maxLogs: chunkLogs,
      })),
    );
  }
  moveChunkFiles(rows, tmpDir, dir, manifest);

  // The contracts of the manifest, with every contract of the chain.
  const contracts = new Map(known);
  for (const contract of chain.contracts) {
    contracts.set(keyOf(contract), {
      project: contract.project,
      version: contract.version,
      name: contract.name,
      address: contract.address,
      creationBlock: contract.creationBlock,
    });
  }
  manifest.contracts = [...contracts.values()];
  manifest.runs.push({
    createdAt: new Date().toISOString(),
    latestBlockNumber: latest,
    toBlock: end,
    logCount: rows.reduce((sum, row) => sum + row.logCount, 0),
    requests: { ...rpc.counts },
    checks: stats,
  });
  manifest.chunks.push(...rows);
  writeManifest(manifestFile, manifest);
  fs.rmSync(partialDir, { recursive: true, force: true });
  const written = rows.filter((row) => row.file !== null).length;
  log(`Wrote ${written} files to ${dir} and ${manifestFile}.`);
  return manifest;
}

// ---------- command line ----------

// The URL of an RPC with a key: the key in keyFile is added to the end of
// url, so that it is not in the command line.
export function withKey(url, keyFile) {
  if (keyFile === undefined) return url;
  // Checked with a placeholder before the key is read: if the key would go
  // into the host or the port, or the URL has a user name or a password, Node
  // prints the key in an error. url must also end with "/" or "=", so that the
  // key is a path segment or a query value. The message leaves out url, which
  // may have a password.
  const placeholder = "KEYPLACEHOLDER";
  const base = URL.parse(url);
  const probe = URL.parse(`${url}${placeholder}`);
  if (
    !(url.endsWith("/") || url.endsWith("=")) ||
    base === null ||
    probe === null ||
    !["http:", "https:"].includes(probe.protocol) ||
    probe.username !== "" ||
    probe.password !== "" ||
    probe.host !== base.host ||
    probe.hash !== "" ||
    !`${probe.pathname}${probe.search}`.endsWith(placeholder)
  ) {
    throw new Error(
      '--rpc must be an http(s) URL without a user name or password that ends with "/" or "=", so that the key is added at the end of the path or the query, with --rpc-key-file.',
    );
  }
  const key = fs.readFileSync(keyFile, "utf8").trim();
  if (!key) throw new Error(`${keyFile} is empty.`);
  return `${url}${key}`;
}

// A positive integer written in decimal digits only, or undefined: Number()
// would also take "0x10", "2.6e7", " 5" and numbers above the safe integers.
export function parsePositiveInteger(text) {
  const value = Number(text);
  return /^[1-9]\d*$/.test(text) && Number.isSafeInteger(value)
    ? value
    : undefined;
}
function positiveInteger(values, name) {
  const value = parsePositiveInteger(values[name]);
  if (value === undefined) {
    console.error(`--${name} must be a positive integer in decimal digits.`);
    process.exit(2);
  }
  return value;
}
function optionalPositiveInteger(values, name) {
  return values[name] === undefined ? undefined : positiveInteger(values, name);
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      chain: { type: "string" },
      rpc: { type: "string" },
      out: { type: "string", default: `static/${WARP_SYNC_DIR}` },
      to: { type: "string" },
      "max-requests": { type: "string", default: "3000" },
      concurrency: { type: "string", default: String(DEFAULT_CONCURRENCY) },
      "part-blocks": { type: "string", default: String(DEFAULT_PART_BLOCKS) },
      "max-width": { type: "string" },
      "rpc-key-file": { type: "string" },
    },
  });
  if (!values.chain || !values.rpc) {
    console.error(
      "Usage: node scripts/warp-sync/build-snapshot.mjs --chain <name> --rpc <url> [--rpc-key-file <path>] [--to <block>] [--out <dir>] [--max-requests <n>] [--concurrency <n>] [--part-blocks <n>] [--max-width <n>]",
    );
    process.exit(2);
  }
  await buildSnapshot({
    chainName: values.chain,
    rpcUrl: withKey(values.rpc, values["rpc-key-file"]),
    outDir: values.out,
    toBlock: optionalPositiveInteger(values, "to"),
    maxRequests: positiveInteger(values, "max-requests"),
    concurrency: positiveInteger(values, "concurrency"),
    partBlocks: positiveInteger(values, "part-blocks"),
    maxWidth: optionalPositiveInteger(values, "max-width"),
    log: (message) => console.log(message),
  });
}
