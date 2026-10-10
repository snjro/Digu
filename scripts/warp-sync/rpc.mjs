// JSON-RPC requests, the kinds of their errors, and the waits after them.

// A request that does not answer in this time is a failure.
const REQUEST_TIMEOUT_MS = Number(
  process.env.WARP_SYNC_REQUEST_TIMEOUT_MS ?? 60_000,
);
// The wait after a failure. Shorter only to check the script with a fake RPC.
export const RETRY_WAIT_MS = Number(
  process.env.WARP_SYNC_RETRY_WAIT_MS ?? 1000,
);
// After HTTP 429 (too many requests, #632), the wait is doubled from
// RETRY_WAIT_MS up to RATE_WAIT_MAX_MS, or is the Retry-After of the answer
// when that is longer, up to RETRY_AFTER_MAX_MS.
const RATE_WAIT_MAX_MS = 30_000;
const RETRY_AFTER_MAX_MS = 60_000;
// HTTP 429 in a row after which the script stops, so that it does not wait
// for hours at a daily limit.
export const MAX_RATE_ERRORS = 30;

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

// rpc.counts has the number of requests sent, by method. A request is cut
// when signal is aborted, with its reason.
export function createRpc(url, maxRequests = Infinity) {
  let id = 0;
  const counts = {};
  async function rpc(method, params = [], signal = undefined) {
    if (id >= maxRequests) {
      throw new RequestLimitError(
        `Stopped at the limit of ${maxRequests} requests.`,
      );
    }
    counts[method] = (counts[method] ?? 0) + 1;
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
      signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
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
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// A sleep that ends early when signal is aborted; the caller then stops at
// signal.throwIfAborted().
export const sleepUnlessAborted = (ms, signal) =>
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
