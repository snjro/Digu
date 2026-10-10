// Builds the warp sync snapshot of a chain: the event logs of its contracts,
// fetched with eth_getLogs under the same conditions as the sync and decoded
// with their ABIs. Run it again to add the logs after the last snapshot. See
// README.md.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { pipeline } from "node:stream/promises";
import { parseArgs } from "node:util";
import { Interface } from "ethers";
import {
  CHUNK_LOGS,
  chunkFileName,
  keyOf,
  lastBlocks,
  moveChunkFiles,
  readManifest,
  readText,
  writeContractChunks,
  writeManifest,
  writeWhole,
  writeWholeAsync,
} from "./snapshot-format.mjs";
import { eventsByTopic0, toSnapshotLog } from "./snapshot-log.mjs";

const CHAINS_DIR = "src/constants/chains";
// The widths of the eth_getLogs ranges, in blocks. pocket returned 500,000
// blocks with the topics in about 10 seconds; wider ranges were not tried.
const FIRST_WIDTH = 100_000;
const MAX_WIDTH = 500_000;
// The widest range for a chain whose public RPC passes the requests to nodes
// that refuse more than 10,000 blocks (Ethereum with pocket: #576, #580).
const MAX_WIDTHS = { eth: 9_999 };
// Like the sync (SUCCESSES_TO_RAISE_LIMIT of eventLogsContract.ts): an RPC may
// pass each request to another node with another limit, so a limit learned
// from failures is doubled again after this many successes in a row.
const SUCCESSES_TO_RAISE_LIMIT = 10;
// Like the sync (ERRORS_TO_HALVE_ANYWAY): failures in a row, of any kind but
// HTTP 429, after which the range is halved.
const ERRORS_TO_HALVE_ANYWAY = 3;
// The blocks of each contract are split into parts of this many blocks, and
// DEFAULT_CONCURRENCY workers take the next part when they finish one (#586).
const DEFAULT_PART_BLOCKS = 500_000;
const DEFAULT_CONCURRENCY = 24;
// Failures in a row before the script gives up.
const MAX_FAILURES = 10;
// Empty answers in a row after which a range is kept as empty (#576). pocket
// returned no logs twice in a row for ranges with logs.
const EMPTY_ANSWERS_TO_KEEP = 3;
// A request that does not answer in this time is a failure.
const REQUEST_TIMEOUT_MS = Number(
  process.env.WARP_SYNC_REQUEST_TIMEOUT_MS ?? 60_000,
);
// The wait after a failure. Shorter only to check the script with a fake RPC.
const RETRY_WAIT_MS = Number(process.env.WARP_SYNC_RETRY_WAIT_MS ?? 1000);
// After HTTP 429 (too many requests, #632), the wait is doubled from
// RETRY_WAIT_MS up to RATE_WAIT_MAX_MS, or is the Retry-After of the answer
// when that is longer, up to RETRY_AFTER_MAX_MS.
const RATE_WAIT_MAX_MS = 30_000;
const RETRY_AFTER_MAX_MS = 60_000;
// HTTP 429 in a row after which the script stops, so that it does not wait
// for hours at a daily limit.
const MAX_RATE_ERRORS = 30;

// ---------- the constants of the app ----------

function match(text, regex, what) {
  const found = text.match(regex);
  if (!found) throw new Error(`Cannot find ${what}.`);
  return found[1];
}
// The paths of the imports of the text of an _index.ts, read with readText
// (without a byte order mark). Every import must have the form of
// regex, so that an import of another form does not leave its contracts out
// without a word. Imports of types, and of modules that are not relative (#…)
// and not a JSON file, are not data and are skipped.
function importsOf(text, regex, what) {
  const paths = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("import ") || line.startsWith("import type "))
      continue;
    if (/ from "[^."][^"]*(?<!\.json)";$/.test(line)) continue;
    const found = line.match(regex);
    if (!found) throw new Error(`Cannot read an import of ${what}: ${line}`);
    paths.push(found[1]);
  }
  if (paths.length === 0) throw new Error(`Cannot find ${what}.`);
  return paths;
}

// Reads the chain from the import lines of the _index.ts files and the JSON
// files that they import.
export function loadChain(chainName, chainsDir = CHAINS_DIR) {
  const chainDirs = importsOf(
    readText(path.join(chainsDir, "_index.ts")),
    /^import \{ chain as \w+ \} from "\.\/([^"]+)\/_index";$/,
    `the chains of ${chainsDir}`,
  );
  for (const chainDir of chainDirs) {
    const dir = path.join(chainsDir, chainDir);
    const index = readText(path.join(dir, "_index.ts"));
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
  for (const projectDir of importsOf(
    chainIndex,
    /^import \{ project as \w+ \} from "\.\/([^"]+)\/_index";$/,
    `the projects of ${chainDir}`,
  )) {
    const dir = path.join(chainDir, projectDir);
    const index = readText(path.join(dir, "_index.ts"));
    const project = match(
      index,
      /export const project: Project = \{\s*name: "([^"]+)"/,
      `the name of ${dir}`,
    );
    for (const versionDir of importsOf(
      index,
      /^import \{ version as \w+ \} from "\.\/([^"]+)\/_index";$/,
      `the versions of ${dir}`,
    )) {
      const vDir = path.join(dir, versionDir);
      const vIndex = readText(path.join(vDir, "_index.ts"));
      const version = match(
        vIndex,
        /export const version: Version = \{\s*name: "([^"]+)"/,
        `the name of ${vDir}`,
      );
      for (const file of importsOf(
        vIndex,
        /^import \w+ from "\.\/([^"]+\.json)";$/,
        `the JSON files of ${vDir}`,
      )) {
        const json = JSON.parse(readText(path.join(vDir, file)));
        const iface = new Interface(json.abi);
        const events = eventsByTopic0(iface);
        if (events.size === 0) continue;
        contracts.push({
          project,
          version,
          name: json.name,
          address: json.address,
          creationBlock: json.creation.blockNumber,
          topics: [...events.keys()],
          // To decode the logs.
          iface,
          events,
        });
      }
    }
  }
  return contracts;
}

// ---------- JSON-RPC ----------

// Thrown before a request over the limit is sent. Not tried again.
export class RequestLimitError extends Error {}

// An error that the RPC returned: an HTTP status, or the error of the
// JSON-RPC response.
// retryAfter: the Retry-After header of the answer, in seconds.
export class RpcError extends Error {
  constructor(method, { status, rpcError, retryAfter }) {
    super(
      `${method}: ${status !== undefined ? `HTTP ${status}` : JSON.stringify(rpcError)}`,
    );
    this.status = status;
    this.rpcError = rpcError;
    this.retryAfter = retryAfter;
  }
}
// Retry-After in seconds. The form with a date is not read.
function retryAfterOf(response) {
  const value = response.headers.get("retry-after")?.trim();
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}

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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      const retryAfter = retryAfterOf(response);
      // A failure to close the body is not the error of the answer.
      await response.body?.cancel().catch(() => {});
      throw new RpcError(method, { status: response.status, retryAfter });
    }
    const body = await response.json();
    if (body.error) throw new RpcError(method, { rpcError: body.error });
    return body.result;
  }
  rpc.counts = counts;
  return rpc;
}

// Like isErrorUnrelatedToRange of the sync (src/utils/utilsEthers.ts): the
// errors of a node without old blocks, which come for any width.
const ERRORS_UNRELATED_TO_RANGE = [
  "historical state is not available",
  "pruned history unavailable",
  "old data not available due to pruning",
];
// "rate": HTTP 429, too many requests in a time (Infura), whatever the range
// (#632). "results": the range has more logs than the RPC returns at once
// (pocket: "query exceeds max results 20000"). "unrelated": an error that may
// not come again for the same range, as in the sync: HTTP 500 or 504, or a
// node without old blocks. "range": any other error, which may come from a
// range that is too wide.
export function classifyError(error) {
  if (!(error instanceof RpcError)) return "range";
  if (error.status === 429) return "rate";
  if ([500, 504].includes(error.status)) return "unrelated";
  const message = String(error.rpcError?.message ?? "");
  // pocket: "max results 20000"; Infura: "query returned more than 10000
  // results".
  if (/max results|more than \d+ results/i.test(message)) return "results";
  if (ERRORS_UNRELATED_TO_RANGE.some((text) => message.includes(text))) {
    return "unrelated";
  }
  return "range";
}
const toHex = (value) => `0x${value.toString(16)}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// A sleep that ends early when signal is aborted; the caller then stops at
// signal.throwIfAborted().
const sleepUnlessAborted = (ms, signal) =>
  new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const wake = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", wake);
      resolve();
    }, ms);
    signal?.addEventListener("abort", wake, { once: true });
  });

// The wait after the rateErrors-th HTTP 429 in a row, with the Retry-After of
// the last one (seconds, or undefined).
export function rateWaitMs(rateErrors, retryAfter, base = RETRY_WAIT_MS) {
  const doubled = Math.min(base * 2 ** (rateErrors - 1), RATE_WAIT_MAX_MS);
  if (retryAfter === undefined) return doubled;
  return Math.min(Math.max(retryAfter * 1000, doubled), RETRY_AFTER_MAX_MS);
}

// The rpc for the requests other than eth_getLogs: asked again after HTTP 429
// with the same waits, up to MAX_RATE_ERRORS in a row; any other error is
// thrown, as before.
export function retryRate(
  rpc,
  { log = () => {}, stats = createFetchStats() } = {},
) {
  return async (method, params) => {
    for (let rateErrors = 1; ; rateErrors++) {
      try {
        return await rpc(method, params);
      } catch (error) {
        if (classifyError(error) !== "rate") throw error;
        stats.errors.rate++;
        if (rateErrors >= MAX_RATE_ERRORS) throw error;
        const wait = rateWaitMs(rateErrors, error.retryAfter);
        log(`${method} failed (rate): ${error.message}; waits ${wait} ms`);
        await sleep(wait);
      }
    }
  };
}

// The widths of the ranges of one contract, shared by its parts, which are
// fetched at the same time: what one part learns, the others use. A part that
// fails keeps its own narrowed widths too (#601), so that the others, which
// work, do not raise them.
export function createWidths(maxWidth = MAX_WIDTH) {
  return {
    cap: maxWidth,
    width: Math.min(FIRST_WIDTH, maxWidth),
    maxWidth,
    successes: 0,
  };
}
function halve(widths) {
  widths.width = Math.max(1, Math.floor(widths.width / 2));
  widths.maxWidth = widths.width;
  widths.successes = 0;
}
// Halves the shared widths, and returns the own widths of a part whose range
// of failedBlocks blocks failed: its half.
function narrow(widths, failedBlocks) {
  halve(widths);
  const half = Math.max(1, Math.floor(failedBlocks / 2));
  return { cap: widths.cap, width: half, maxWidth: half, successes: 0 };
}
// After a full range that works: the width is doubled, up to maxWidth, which
// is doubled after SUCCESSES_TO_RAISE_LIMIT in a row, up to cap.
function raise(widths) {
  widths.successes++;
  if (widths.successes >= SUCCESSES_TO_RAISE_LIMIT) {
    widths.maxWidth = Math.min(widths.maxWidth * 2, widths.cap);
    widths.successes = 0;
  }
  widths.width = Math.min(widths.width * 2, widths.maxWidth);
}

// What happened in a run, for the manifest.
export function createFetchStats() {
  return {
    // #576: an empty range is asked again until EMPTY_ANSWERS_TO_KEEP empty
    // answers in a row, or until an answer has logs.
    emptyRangesAskedAgain: 0,
    emptyRangesWithLogs: 0,
    errors: { rate: 0, results: 0, unrelated: 0, range: 0 },
  };
}

// Fetches the logs of [fromBlock, toBlock] in ranges, like the sync (#549,
// #554, #591). How the ranges are widened and halved, and what each kind of
// failure ("rate", "results", "unrelated", "range") and an empty result do,
// and how a stop of another part ends a wait, is in "Widths", "Failures",
// "Empty results (#576)" and "Parts (#586)" of README.md.
// Each range that works goes to onRange(from, to, logs), with its logs by
// block and log index, so that the logs are not all kept in memory. Returns
// the number of logs. It stops before the next request when signal is
// aborted (another part stopped).
export async function fetchLogs(
  rpc,
  contract,
  fromBlock,
  toBlock,
  {
    log = () => {},
    onRange = () => {},
    signal = undefined,
    widths = createWidths(),
    stats = createFetchStats(),
  } = {},
) {
  let count = 0;
  let from = fromBlock;
  let failures = 0;
  let rangeFailures = 0;
  // HTTP 429 in a row.
  let rateErrors = 0;
  // The own widths of the part after a halving, until a range that works
  // raises them to the shared width.
  let own = undefined;
  // The end of an empty range that is asked again, and its empty answers.
  let askAgainTo = undefined;
  let emptyAnswers = 0;
  while (from <= toBlock) {
    signal?.throwIfAborted();
    const width = own ? Math.min(own.width, widths.width) : widths.width;
    const to = askAgainTo ?? Math.min(from + width - 1, toBlock);
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
      const kind = classifyError(error);
      stats.errors[kind]++;
      if (kind === "rate") {
        if (++rateErrors >= MAX_RATE_ERRORS) throw error;
        const wait = rateWaitMs(rateErrors, error.retryAfter);
        log(
          `${contract.name}: ${from}-${to} failed (rate): ${error.message}; waits ${wait} ms`,
        );
        await sleepUnlessAborted(wait, signal);
        continue;
      }
      rateErrors = 0;
      log(`${contract.name}: ${from}-${to} failed (${kind}): ${error.message}`);
      if (kind === "results") {
        // Not the empty range any more: a narrower one.
        askAgainTo = undefined;
        emptyAnswers = 0;
        own = narrow(widths, to - from + 1);
        continue;
      }
      failures++;
      if (kind === "range") rangeFailures++;
      if (failures >= MAX_FAILURES) throw error;
      if (rangeFailures >= 2 || failures >= ERRORS_TO_HALVE_ANYWAY) {
        askAgainTo = undefined;
        emptyAnswers = 0;
        own = narrow(widths, to - from + 1);
      }
      await sleep(RETRY_WAIT_MS);
      continue;
    }
    rateErrors = 0;
    if (result.length === 0 && ++emptyAnswers < EMPTY_ANSWERS_TO_KEEP) {
      if (askAgainTo === undefined) stats.emptyRangesAskedAgain++;
      askAgainTo = to;
      continue;
    }
    if (askAgainTo !== undefined && result.length > 0) {
      stats.emptyRangesWithLogs++;
      log(
        `${contract.name}: ${from}-${to} was empty, then ${result.length} logs`,
      );
    }
    askAgainTo = undefined;
    emptyAnswers = 0;
    // Outside the try: an error of onRange (writing the file) is not a
    // failure of the RPC.
    onRange(from, to, sortLogs(result));
    count += result.length;
    log(`${contract.name}: ${from}-${to} ${result.length} logs`);
    failures = 0;
    rangeFailures = 0;
    // A range cut at toBlock does not show that the width works.
    if (to - from + 1 === width) {
      // The widths that have the width of the range count it: the shared
      // ones by their width after the answer, since another part may have
      // changed them meanwhile. Both when they are equal.
      if (widths.width === width) raise(widths);
      if (own?.width === width) {
        raise(own);
        if (own.width > width && own.width >= widths.width) own = undefined;
      }
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

// Decodes the logs, by block and log index, into the logs of the snapshot. A
// log without blockTimestamp gets it from its block.
export async function* toSnapshotLogs(rpc, contract, rawLogs) {
  let timestamp = undefined; // [blockNumber, blockTimestamp] of the last block asked
  for await (const raw of rawLogs) {
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
    yield toSnapshotLog(contract, raw, blockTimestamp);
  }
}

// Splits [fromBlock, toBlock] into parts of partBlocks blocks, in order (the
// last one shorter).
export function splitParts(fromBlock, toBlock, partBlocks) {
  const parts = [];
  for (let from = fromBlock; from <= toBlock; from += partBlocks) {
    parts.push([from, Math.min(from + partBlocks - 1, toBlock)]);
  }
  return parts;
}

// ---------- the snapshot ----------

// The logs fetched so far of each part, so that a run that stopped (at
// --max-requests, or after failures) goes on where it stopped. Each part
// has a .jsonl file, to which the logs of each range are added, one log per
// line, and a .state.json file with the next block to fetch. The logs are
// added before the state is written, so after a stop the lines of the blocks
// from the next block on are dropped.
const PARTIAL_DIR = ".partial";
// The files of the snapshot, written before they are moved next to the
// manifest.
const OUT_DIR = "out";
const partKeyOf = (part) => `${keyOf(part)}/${part.partFrom}-${part.partTo}`;
function partFiles(partialDir, part) {
  const base = path.join(
    partialDir,
    `${part.project}__${part.version}__${part.name}__${part.partFrom}`,
  );
  return { logs: `${base}.jsonl`, state: `${base}.state.json` };
}
function readStates(partialDir) {
  const states = new Map();
  if (!fs.existsSync(partialDir)) return states;
  for (const file of fs.readdirSync(partialDir)) {
    if (file.endsWith(".state.json")) {
      const state = JSON.parse(readText(path.join(partialDir, file)));
      states.set(partKeyOf(state), state);
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
  writeWhole(file, (tmp) => fs.writeFileSync(tmp, JSON.stringify(state)));
}
// The kept lines are written in pieces of about this many characters.
const KEEP_BATCH_LENGTH = 1 << 20;
// Keeps the lines of the blocks before nextBlock. A line that a stop left
// half written is dropped too. It streams the file, which can be larger than
// a string can hold: pipeline writes all of it, closes the files, and passes
// on an error of the read or of the write.
export async function keepLogsBefore(file, nextBlock) {
  if (!fs.existsSync(file)) return;
  const isKept = (line) => {
    try {
      return Number(JSON.parse(line).blockNumber) < nextBlock;
    } catch {
      return false;
    }
  };
  await writeWholeAsync(file, (tmp) =>
    pipeline(
      fs.createReadStream(file),
      async function* (input) {
        let kept = "";
        for await (const line of linesOf(input)) {
          if (!isKept(line)) continue;
          kept += `${line}\n`;
          if (kept.length >= KEEP_BATCH_LENGTH) {
            yield kept;
            kept = "";
          }
        }
        if (kept) yield kept;
      },
      fs.createWriteStream(tmp),
    ),
  );
}
// The lines of a stream. When the loop ends, also early or by an error, the
// interface is closed (it would otherwise give the error of its input again,
// with no listener: an uncaught error) and the input is destroyed (closing
// the interface takes its listener off the input).
export async function* linesOf(input) {
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  try {
    yield* lines;
  } finally {
    lines.close();
    input.destroy();
  }
}
async function* readLogs(file) {
  if (!fs.existsSync(file)) return;
  for await (const line of linesOf(fs.createReadStream(file))) {
    if (line) yield JSON.parse(line);
  }
}
async function* readParts(files) {
  for (const file of files) yield* readLogs(file);
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
    // The manifest is not changed: a run adds the contracts of the chain to
    // manifest.contracts only with logs to fetch (#761).
    const missing = chain.contracts.map(keyOf).filter((key) => !known.has(key));
    if (!fs.existsSync(manifestFile)) {
      log(
        `Nothing to add: no contract of ${chain.name} is created by block ${end}.`,
      );
    } else if (missing.length > 0) {
      log(
        `Nothing to add to block ${end}, and not in manifest.contracts: ${missing.join(", ")}. A run cannot add them yet (#761).`,
      );
    } else {
      log(`Nothing to add: the snapshot already reaches block ${end}.`);
    }
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
    const resumed = saved?.fromBlock === from ? saved : undefined;
    const nextBlock = resumed?.nextBlock ?? partFrom;
    await keepLogsBefore(files.logs, nextBlock);
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
        writeState(files.state, { ...part, nextBlock: to + 1 });
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
        logs: toSnapshotLogs(ask, contract, readParts(files)),
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({
    options: {
      chain: { type: "string" },
      rpc: { type: "string" },
      out: { type: "string", default: "static/warp-sync" },
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
