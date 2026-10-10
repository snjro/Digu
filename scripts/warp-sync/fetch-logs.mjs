// Fetches the logs of a contract with eth_getLogs in ranges, like the sync.
import {
  classifyError,
  MAX_RATE_ERRORS,
  rateWaitMs,
  RequestLimitError,
  RETRY_WAIT_MS,
  sleep,
  sleepUnlessAborted,
} from "./rpc.mjs";

// The widths of the eth_getLogs ranges, in blocks. pocket returned 500,000
// blocks with the topics in about 10 seconds; wider ranges were not tried.
const FIRST_WIDTH = 100_000;
export const MAX_WIDTH = 500_000;
// The widest range for a chain whose public RPC passes the requests to nodes
// that refuse more than 10,000 blocks (Ethereum with pocket: #576, #580).
export const MAX_WIDTHS = { eth: 9_999 };
// Like the sync (SUCCESSES_TO_RAISE_LIMIT of eventLogsContract.ts): an RPC may
// pass each request to another node with another limit, so a limit learned
// from failures is doubled again after this many successes in a row.
const SUCCESSES_TO_RAISE_LIMIT = 10;
// Like the sync (ERRORS_TO_HALVE_ANYWAY): failures in a row, of any kind but
// HTTP 429, after which the range is halved.
const ERRORS_TO_HALVE_ANYWAY = 3;
// Failures in a row before the script gives up.
const MAX_FAILURES = 10;
// Empty answers in a row after which a range is kept as empty (#576). pocket
// returned no logs twice in a row for ranges with logs.
const EMPTY_ANSWERS_TO_KEEP = 3;

const toHex = (value) => `0x${value.toString(16)}`;

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

// Splits [fromBlock, toBlock] into parts of partBlocks blocks, in order (the
// last one shorter).
export function splitParts(fromBlock, toBlock, partBlocks) {
  const parts = [];
  for (let from = fromBlock; from <= toBlock; from += partBlocks) {
    parts.push([from, Math.min(from + partBlocks - 1, toBlock)]);
  }
  return parts;
}
