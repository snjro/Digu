// Builds the warp sync snapshot of a chain: the raw event logs of its
// contracts, fetched with eth_getLogs under the same conditions as the sync.
// Run it again to add the logs after the last snapshot. See README.md.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { parseArgs } from "node:util";
import { Interface } from "ethers";
import {
  CHUNK_LOGS,
  chunkFileName,
  keyOf,
  lastBlocks,
  moveChunkFiles,
  readManifest,
  writeContractChunks,
  writeManifest,
} from "./snapshot-format.mjs";

const CHAINS_DIR = "src/constants/chains";
// The widths of the eth_getLogs ranges, in blocks. pocket returned 500,000
// blocks with the topics in about 10 seconds; wider ranges were not tried.
const FIRST_WIDTH = 100_000;
const MAX_WIDTH = 500_000;
// Like the sync (SUCCESSES_TO_RAISE_LIMIT of eventLogsContract.ts): an RPC may
// pass each request to another node with another limit, so a limit learned
// from failures is doubled again after this many successes in a row.
const SUCCESSES_TO_RAISE_LIMIT = 10;
// The range of each contract is split into this many segments, fetched at
// the same time. A segment has at least MAX_WIDTH blocks.
const DEFAULT_SEGMENTS = 4;
// Failures in a row before the script gives up.
const MAX_FAILURES = 10;
// The wait after a failure. Shorter only to check the script with a fake RPC.
const RETRY_WAIT_MS = Number(process.env.WARP_SYNC_RETRY_WAIT_MS ?? 1000);

// ---------- the constants of the app ----------

function read(file) {
  return fs.readFileSync(file, "utf8");
}
function match(text, regex, what) {
  const found = text.match(regex);
  if (!found) throw new Error(`Cannot find ${what}.`);
  return found[1];
}
function matchAll(text, regex) {
  return [...text.matchAll(regex)].map((found) => found[1]);
}

// Reads the chain like fake-rpc.mjs of screen-check: from the _index.ts files
// and the JSON files they import.
export function loadChain(chainName, chainsDir = CHAINS_DIR) {
  const chainDirs = matchAll(
    read(path.join(chainsDir, "_index.ts")),
    /import \{ chain as \w+ \} from "\.\/([^"]+)\/_index";/g,
  );
  for (const chainDir of chainDirs) {
    const dir = path.join(chainsDir, chainDir);
    const index = read(path.join(dir, "_index.ts"));
    const name = match(
      index,
      /export const chain: Chain = \{\s*name: "([^"]+)"/,
      `the name of ${dir}`,
    );
    if (name !== chainName) continue;
    return {
      name,
      chainId: Number(match(index, /chainId: (\d+)/, "chainId")),
      confirmationBlocks: Number(
        match(index, /confirmationBlocks: (\d+)/, "confirmationBlocks"),
      ),
      contracts: loadContracts(dir, index),
    };
  }
  throw new Error(`No chain named "${chainName}" in ${chainsDir}.`);
}
function loadContracts(chainDir, chainIndex) {
  const contracts = [];
  for (const projectDir of matchAll(
    chainIndex,
    /import \{ project as \w+ \} from "\.\/([^"]+)\/_index";/g,
  )) {
    const dir = path.join(chainDir, projectDir);
    const index = read(path.join(dir, "_index.ts"));
    const project = match(
      index,
      /export const project: Project = \{\s*name: "([^"]+)"/,
      `the name of ${dir}`,
    );
    for (const versionDir of matchAll(
      index,
      /import \{ version as \w+ \} from "\.\/([^"]+)\/_index";/g,
    )) {
      const vDir = path.join(dir, versionDir);
      const vIndex = read(path.join(vDir, "_index.ts"));
      const version = match(
        vIndex,
        /export const version: Version = \{\s*name: "([^"]+)"/,
        `the name of ${vDir}`,
      );
      for (const file of matchAll(
        vIndex,
        /import \w+ from "\.\/([^"]+\.json)";/g,
      )) {
        const json = JSON.parse(read(path.join(vDir, file)));
        // Like convertJsonToABI.ts: anonymous events are not synced.
        const iface = new Interface(json.abi);
        const topics = [];
        iface.forEachEvent((fragment) => {
          if (!fragment.anonymous) topics.push(fragment.topicHash);
        });
        if (topics.length === 0) continue;
        contracts.push({
          project,
          version,
          name: json.name,
          address: json.address,
          creationBlock: json.creation.blockNumber,
          topics,
        });
      }
    }
  }
  return contracts;
}

// ---------- JSON-RPC ----------

// Thrown before a request over the limit is sent. Not tried again.
export class RequestLimitError extends Error {}

// rpc.counts has the number of requests sent, by method.
export function createRpc(url, maxRequests = Infinity) {
  let id = 0;
  const counts = {};
  async function rpc(method, params = []) {
    if (id >= maxRequests) {
      throw new RequestLimitError(
        `Stopped at the limit of ${maxRequests} requests.`,
      );
    }
    counts[method] = (counts[method] ?? 0) + 1;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    });
    if (!response.ok) {
      throw new Error(`${method}: HTTP ${response.status}`);
    }
    const body = await response.json();
    if (body.error) {
      throw new Error(`${method}: ${JSON.stringify(body.error)}`);
    }
    return body.result;
  }
  rpc.counts = counts;
  return rpc;
}
const toHex = (value) => `0x${value.toString(16)}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetches the logs of [fromBlock, toBlock] in ranges, like the sync (#549,
// #554): a failed range is tried again once, then halved, and the half
// becomes the widest range until SUCCESSES_TO_RAISE_LIMIT full ranges work in
// a row. A full range that works doubles the next one. Each range that works
// goes to onRange(from, to, logs), with its logs by block and log index, so
// that the logs are not all kept in memory. Returns the number of logs. It
// stops before the next request when signal is aborted (another segment
// stopped).
export async function fetchLogs(
  rpc,
  contract,
  fromBlock,
  toBlock,
  log,
  onRange = () => {},
  signal = undefined,
) {
  let count = 0;
  let width = FIRST_WIDTH;
  let maxWidth = MAX_WIDTH;
  let successes = 0;
  let from = fromBlock;
  let failures = 0;
  while (from <= toBlock) {
    signal?.throwIfAborted();
    const to = Math.min(from + width - 1, toBlock);
    let result;
    try {
      result = await rpc("eth_getLogs", [
        {
          address: contract.address,
          topics: [contract.topics],
          fromBlock: toHex(from),
          toBlock: toHex(to),
        },
      ]);
    } catch (error) {
      if (error instanceof RequestLimitError || signal?.aborted) throw error;
      failures++;
      log(`${contract.name}: ${from}-${to} failed: ${error.message}`);
      if (failures >= MAX_FAILURES) throw error;
      if (failures >= 2) {
        width = Math.max(1, Math.floor(width / 2));
        maxWidth = width;
        successes = 0;
      }
      await sleep(RETRY_WAIT_MS);
      continue;
    }
    // Outside the try: an error of onRange (writing the file) is not a
    // failure of the RPC.
    onRange(from, to, sortLogs(result));
    count += result.length;
    log(`${contract.name}: ${from}-${to} ${result.length} logs`);
    failures = 0;
    // A range cut at toBlock does not show that the width works.
    if (to - from + 1 === width) {
      successes++;
      if (successes >= SUCCESSES_TO_RAISE_LIMIT) {
        maxWidth = Math.min(maxWidth * 2, MAX_WIDTH);
        successes = 0;
      }
      width = Math.min(width * 2, maxWidth);
    }
    from = to + 1;
  }
  return count;
}

const sortLogs = (logs) =>
  [...logs].sort(
    (a, b) =>
      Number(a.blockNumber) - Number(b.blockNumber) ||
      Number(a.logIndex) - Number(b.logIndex),
  );

// Keeps the fields that the app reads, as the RPC returned them, for logs by
// block and log index. A log without blockTimestamp gets it from its block.
export async function* toSnapshotLogs(rpc, contract, rawLogs) {
  let timestamp = undefined; // [blockNumber, blockTimestamp] of the last block asked
  for await (const raw of rawLogs) {
    if (raw.removed) throw new Error(`A removed log: ${JSON.stringify(raw)}`);
    if (raw.address.toLowerCase() !== contract.address.toLowerCase()) {
      throw new Error(`A log of another address: ${raw.address}`);
    }
    let blockTimestamp = raw.blockTimestamp;
    if (!blockTimestamp) {
      if (timestamp?.[0] !== raw.blockNumber) {
        const block = await rpc("eth_getBlockByNumber", [
          raw.blockNumber,
          false,
        ]);
        timestamp = [raw.blockNumber, block.timestamp];
      }
      blockTimestamp = timestamp[1];
    }
    yield {
      blockNumber: raw.blockNumber,
      blockHash: raw.blockHash,
      blockTimestamp,
      transactionHash: raw.transactionHash,
      transactionIndex: raw.transactionIndex,
      logIndex: raw.logIndex,
      address: raw.address,
      data: raw.data,
      topics: raw.topics,
    };
  }
}

// Splits [fromBlock, toBlock] into at most `segments` ranges in order, each of
// MAX_WIDTH blocks or more (one range when it is shorter).
export function splitRange(fromBlock, toBlock, segments) {
  const length = toBlock - fromBlock + 1;
  const count = Math.max(1, Math.min(segments, Math.floor(length / MAX_WIDTH)));
  const ranges = [];
  for (let i = 0; i < count; i++) {
    ranges.push([
      fromBlock + Math.floor((length * i) / count),
      fromBlock + Math.floor((length * (i + 1)) / count) - 1,
    ]);
  }
  return ranges;
}

// ---------- the snapshot ----------

// The logs fetched so far of each segment, so that a run that stopped (at
// --max-requests, or after failures) goes on where it stopped. Each segment
// has a .jsonl file, to which the logs of each range are added, one log per
// line, and a .state.json file with the next block to fetch. The logs are
// added before the state is written, so after a stop the lines of the blocks
// from the next block on are dropped.
const PARTIAL_DIR = ".partial";
// The files of the snapshot, written before they are moved next to the
// manifest.
const OUT_DIR = "out";
const segmentKeyOf = (segment) =>
  `${keyOf(segment)}/${segment.segmentFrom}-${segment.segmentTo}`;
function segmentFiles(partialDir, segment) {
  const base = path.join(
    partialDir,
    `${segment.project}__${segment.version}__${segment.name}__${segment.segmentFrom}`,
  );
  return { logs: `${base}.jsonl`, state: `${base}.state.json` };
}
function readStates(partialDir) {
  const states = new Map();
  if (!fs.existsSync(partialDir)) return states;
  for (const file of fs.readdirSync(partialDir)) {
    if (file.endsWith(".state.json")) {
      const state = JSON.parse(read(path.join(partialDir, file)));
      states.set(segmentKeyOf(state), state);
    } else if (file.endsWith(".json")) {
      // The logs of a segment in one .json file, before formatVersion 2.
      throw new Error(
        `${path.join(partialDir, file)} is of an older version of this script. Delete ${partialDir} and run it again.`,
      );
    }
  }
  return states;
}
function writeState(file, state) {
  // Written whole and then renamed, so that a stop does not leave half a file.
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(state));
  fs.renameSync(`${file}.tmp`, file);
}
// Keeps the lines of the blocks before nextBlock. A line that a stop left
// half written is dropped too. It streams the file, which can be larger than
// a string can hold.
export async function keepLogsBefore(file, nextBlock) {
  if (!fs.existsSync(file)) return;
  const tmp = `${file}.tmp`;
  const out = fs.openSync(tmp, "w");
  try {
    const lines = readline.createInterface({
      input: fs.createReadStream(file),
      crlfDelay: Infinity,
    });
    for await (const line of lines) {
      let raw;
      try {
        raw = JSON.parse(line);
      } catch {
        continue;
      }
      if (Number(raw.blockNumber) < nextBlock) fs.writeSync(out, `${line}\n`);
    }
  } finally {
    fs.closeSync(out);
  }
  fs.renameSync(tmp, file);
}
async function* readLogs(file) {
  if (!fs.existsSync(file)) return;
  const lines = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    if (line) yield JSON.parse(line);
  }
}
async function* readSegments(files) {
  for (const file of files) yield* readLogs(file);
}

export async function buildSnapshot({
  chainName,
  rpcUrl,
  outDir,
  toBlock,
  maxRequests,
  segments = DEFAULT_SEGMENTS,
  chunkLogs = CHUNK_LOGS,
  log,
}) {
  const chain = loadChain(chainName);
  const rpc = createRpc(rpcUrl, maxRequests);
  try {
    return await build(chain, rpc, outDir, toBlock, segments, chunkLogs, log);
  } finally {
    log(`Requests: ${JSON.stringify(rpc.counts)}`);
  }
}

async function build(chain, rpc, outDir, toBlock, segments, chunkLogs, log) {
  const chainId = Number(await rpc("eth_chainId"));
  if (chainId !== chain.chainId) {
    throw new Error(`The RPC is for chainId ${chainId}, not ${chain.chainId}.`);
  }
  const latest = Number(await rpc("eth_blockNumber"));
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
    plans.push({ contract, from, ranges: splitRange(from, end, segments) });
  }
  if (plans.length === 0) {
    fs.rmSync(partialDir, { recursive: true, force: true });
    log(`Nothing to add: the snapshot already reaches block ${end}.`);
    return undefined;
  }

  // The contracts are fetched at the same time, like the sync, and each
  // contract in segments at the same time. When one segment stops (at
  // --max-requests, or after failures), the others stop before their next
  // request, and all keep what they fetched in .partial/.
  fs.mkdirSync(partialDir, { recursive: true });
  const controller = new AbortController();
  const fetchSegment = async ({ contract, from }, [segmentFrom, segmentTo]) => {
    const segment = {
      project: contract.project,
      version: contract.version,
      name: contract.name,
      end,
      fromBlock: from,
      segmentFrom,
      segmentTo,
    };
    const files = segmentFiles(partialDir, segment);
    const saved = states.get(segmentKeyOf(segment));
    const resumed = saved?.fromBlock === from ? saved : undefined;
    const nextBlock = resumed?.nextBlock ?? segmentFrom;
    await keepLogsBefore(files.logs, nextBlock);
    if (resumed) {
      log(
        `${keyOf(contract)} ${segmentFrom}-${segmentTo}: go on from ${nextBlock}.`,
      );
    }
    await fetchLogs(
      rpc,
      contract,
      nextBlock,
      segmentTo,
      log,
      (_from, to, logs) => {
        fs.appendFileSync(
          files.logs,
          logs.map((raw) => `${JSON.stringify(raw)}\n`).join(""),
        );
        writeState(files.state, { ...segment, nextBlock: to + 1 });
      },
      controller.signal,
    );
    return files.logs;
  };
  const fetches = plans.map((plan) =>
    plan.ranges.map((range) =>
      fetchSegment(plan, range).catch((error) => {
        controller.abort(error);
        throw error;
      }),
    ),
  );
  const results = await Promise.allSettled(fetches.flat());
  if (results.some((result) => result.status === "rejected")) {
    // The error of the segment that stopped first.
    throw controller.signal.reason;
  }

  // Writes the files one contract at a time, reading the logs of its
  // segments in the order of the blocks, so that the logs are not all in
  // memory.
  const tmpDir = path.join(partialDir, OUT_DIR);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  const rows = [];
  for (const [i, { contract, from }] of plans.entries()) {
    const files = await Promise.all(fetches[i]);
    rows.push(
      ...(await writeContractChunks({
        chainId: chain.chainId,
        contract,
        fromBlock: from,
        toBlock: end,
        logs: toSnapshotLogs(rpc, contract, readSegments(files)),
        outDir: tmpDir,
        maxLogs: chunkLogs,
      })),
    );
  }
  moveChunkFiles(rows, tmpDir, dir, manifest);

  for (const contract of chain.contracts) {
    known.set(keyOf(contract), {
      project: contract.project,
      version: contract.version,
      name: contract.name,
      address: contract.address,
      creationBlock: contract.creationBlock,
    });
  }
  manifest.contracts = [...known.values()];
  manifest.runs.push({
    createdAt: new Date().toISOString(),
    latestBlockNumber: latest,
    toBlock: end,
    logCount: rows.reduce((sum, row) => sum + row.logCount, 0),
    requests: { ...rpc.counts },
  });
  manifest.chunks.push(...rows);
  writeManifest(manifestFile, manifest);
  fs.rmSync(partialDir, { recursive: true, force: true });
  const written = rows.filter((row) => row.file !== null).length;
  log(`Wrote ${written} files to ${dir} and ${manifestFile}.`);
  return manifest;
}

// ---------- command line ----------

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({
    options: {
      chain: { type: "string" },
      rpc: { type: "string" },
      out: { type: "string", default: "static/warp-sync" },
      to: { type: "string" },
      "max-requests": { type: "string", default: "3000" },
      segments: { type: "string", default: String(DEFAULT_SEGMENTS) },
    },
  });
  if (!values.chain || !values.rpc) {
    console.error(
      "Usage: node scripts/warp-sync/build-snapshot.mjs --chain <name> --rpc <url> [--to <block>] [--out <dir>] [--max-requests <n>] [--segments <n>]",
    );
    process.exit(2);
  }
  const maxRequests = Number(values["max-requests"]);
  if (!Number.isInteger(maxRequests) || maxRequests <= 0) {
    console.error(`--max-requests must be a positive integer.`);
    process.exit(2);
  }
  const segments = Number(values.segments);
  if (!Number.isInteger(segments) || segments <= 0) {
    console.error(`--segments must be a positive integer.`);
    process.exit(2);
  }
  await buildSnapshot({
    chainName: values.chain,
    rpcUrl: values.rpc,
    outDir: values.out,
    toBlock: values.to === undefined ? undefined : Number(values.to),
    maxRequests,
    segments,
    log: (message) => console.log(message),
  });
}
