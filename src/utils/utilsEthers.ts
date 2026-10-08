import type {
  Chain,
  ChainName,
  Contract,
  EventAbiFragment,
} from "#constants/chains/types.js";
import { updateDbItemChainStatus } from "#db/dbChainStatusDataHandlers.js";
import type { EthersEventLog, NodeStatus } from "#db/dbTypes.js";
import { customLogger } from "./logger";
import { getUrlObject } from "./utilsCommon";
import { getTargetChain } from "./utilsDb";
import {
  JsonRpcProvider,
  Network,
  WebSocketProvider,
  EventLog,
  getNumber,
  isError,
  isHexString,
  makeError,
  type Contract as EthersContract,
  type Log,
  type LogParams,
  type JsonRpcApiProviderOptions,
  type JsonRpcError,
  type JsonRpcPayload,
  type JsonRpcResult,
} from "ethers";
export type AbiFormatType = "json" | "full" | "minimal";

// Anonymous events are not synced, so a contract that has only anonymous
// events has no event to sync.
export function hasSyncTargetEvents(contract: Contract): boolean {
  return contract.events.names.length > 0;
}
export function extractEventContracts(targetContracts: Contract[]): Contract[] {
  const eventContracts: Contract[] = targetContracts.filter(
    (contract: Contract) => {
      return hasSyncTargetEvents(contract);
    },
  );
  return eventContracts;
}
export type NodeProvider = JsonRpcProvider | WebSocketProvider;

// The blocks of the current map when it becomes the previous one. A block
// is read right after the eth_getLogs answer that has it, and the range of an
// answer has at most MAX_BULK_UNIT (100,000) blocks. The contracts of a chain
// fetch at the same time with one provider, so the answers of the others can
// drop a block before it is read; it is then read from the DB or the RPC.
export const MAX_BLOCK_TIMESTAMPS: number = 100000;
// The timestamps by block number, in two maps, so that old blocks are dropped
// without deleting them one by one: at most twice maxSize blocks.
export class BlockTimestamps {
  #current: Map<number, number> = new Map();
  #previous: Map<number, number> = new Map();
  constructor(private readonly maxSize: number = MAX_BLOCK_TIMESTAMPS) {}
  set(blockNumber: number, timestamp: number): void {
    this.#current.set(blockNumber, timestamp);
    if (this.#current.size >= this.maxSize) {
      this.#previous = this.#current;
      this.#current = new Map();
    }
  }
  get(blockNumber: number): number | undefined {
    return this.#current.get(blockNumber) ?? this.#previous.get(blockNumber);
  }
}
// The blockTimestamp that an RPC may put in each log, for each provider.
// ethers does not keep it in a Log.
const blockTimestampsOfProviders: WeakMap<NodeProvider, BlockTimestamps> =
  new WeakMap();
function keepBlockTimestamp(provider: NodeProvider, log: LogParams): void {
  // The raw log from the RPC, which ethers types as LogParams.
  const blockTimestamp: unknown = (log as { blockTimestamp?: unknown })
    .blockTimestamp;
  if (!isHexString(blockTimestamp)) {
    return;
  }
  blockTimestampsOfProviders
    .get(provider)
    ?.set(getNumber(log.blockNumber), getNumber(blockTimestamp));
}
// The blockTimestamp of a log that this provider has returned, if any.
export function getBlockTimestampFromLogs(
  provider: NodeProvider,
  blockNumber: number,
): number | undefined {
  return blockTimestampsOfProviders.get(provider)?.get(blockNumber);
}
// ethers calls _wrapLog with each log of eth_getLogs.
export class JsonRpcProviderKeepingBlockTimestamps extends JsonRpcProvider {
  constructor(
    url: string,
    options: JsonRpcApiProviderOptions,
    maxBlockTimestamps: number = MAX_BLOCK_TIMESTAMPS,
  ) {
    super(url, undefined, options);
    blockTimestampsOfProviders.set(
      this,
      new BlockTimestamps(maxBlockTimestamps),
    );
  }
  override _wrapLog(value: LogParams, network: Network): Log {
    keepBlockTimestamp(this, value);
    return super._wrapLog(value, network);
  }
}
class WebSocketProviderKeepingBlockTimestamps extends WebSocketProvider {
  // Rejects when the socket closes. ethers 6.17.0 does not set onclose, and
  // a request on a closed socket waits forever.
  readonly #closed: Promise<never>;
  constructor(url: string) {
    super(url);
    blockTimestampsOfProviders.set(this, new BlockTimestamps());
    this.#closed = new Promise<never>((_, reject) => {
      (this.websocket as WebSocket).onclose = () => {
        reject(makeError("WebSocket closed.", "NETWORK_ERROR"));
      };
    });
    // A close with no request waiting is not an error.
    this.#closed.catch(() => {});
  }
  override async _send(
    payload: JsonRpcPayload | JsonRpcPayload[],
  ): Promise<(JsonRpcResult | JsonRpcError)[]> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
    try {
      return await Promise.race([
        super._send(payload),
        this.#closed,
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(
              makeError("RPC request timed out.", "TIMEOUT", {
                operation: Array.isArray(payload)
                  ? payload.map((p: JsonRpcPayload) => p.method).join(",")
                  : payload.method,
                reason: "timeout",
              }),
            );
          }, RPC_REQUEST_TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearTimeout(timeoutId);
    }
  }
  override _wrapLog(value: LogParams, network: Network): Log {
    keepBlockTimestamp(this, value);
    return super._wrapLog(value, network);
  }
}

// The number of the latest call for each chain, so that an earlier call that
// ends last does not overwrite the node status of a later one.
const latestNodeProviderCalls: Record<ChainName, number> = {};
// The status of the newest call that a later call kept from writing it, for
// each chain. A cancel of that later call writes it.
const skippedNodeStatuses: Record<
  ChainName,
  { callNumber: number; nodeStatus: NodeStatus }
> = {};

// A WebSocket that never opens makes getNetwork wait forever.
const GET_NETWORK_TIMEOUT_MS: number = 10000;
// A WebSocket that stays open but does not answer makes a request wait forever.
const RPC_REQUEST_TIMEOUT_MS: number = 60000;

// Shows CONNECTING. The number is taken before the write, so that an earlier
// call cannot write its status after it.
export async function startNodeProviderCall(
  chainName: ChainName,
): Promise<number> {
  const callNumber: number = (latestNodeProviderCalls[chainName] ?? 0) + 1;
  latestNodeProviderCalls[chainName] = callNumber;
  await updateDbItemChainStatus(chainName, "nodeStatus", "CONNECTING");
  return callNumber;
}

// For a started call that does not connect. Giving the number back lets an
// earlier call that is still running write its status. When the earlier call
// has already ended, its status is written instead of the previous one.
export async function cancelNodeProviderCall(
  chainName: ChainName,
  callNumber: number,
  previousNodeStatus: NodeStatus,
): Promise<void> {
  if (latestNodeProviderCalls[chainName] === callNumber) {
    latestNodeProviderCalls[chainName] = callNumber - 1;
    const skipped = skippedNodeStatuses[chainName];
    delete skippedNodeStatuses[chainName];
    await updateDbItemChainStatus(
      chainName,
      "nodeStatus",
      skipped?.callNumber === callNumber - 1
        ? skipped.nodeStatus
        : previousNodeStatus,
    );
  }
}

// Returns the provider when this call succeeds, even if a newer call ran.
export async function getNodeProvider(
  targetChain: Chain,
  rpc: string,
  startedCallNumber?: number,
): Promise<NodeProvider | undefined> {
  const callNumber: number =
    startedCallNumber ?? (await startNodeProviderCall(targetChain.name));
  const httpProtocols: string[] = ["http:", "https:"];
  const webSocketProtocols: string[] = ["ws:", "wss:"];
  const url: URL | undefined = getUrlObject(rpc);

  let nodeProvider: NodeProvider | undefined = undefined;
  let nodeStatus: NodeStatus;
  if (url === undefined) {
    nodeStatus = "INVALID_URL";
  } else if ([...httpProtocols, ...webSocketProtocols].includes(url.protocol)) {
    const targetNetwork: Network = Network.from(targetChain.chainId);
    let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
    const timeoutError: Error = new Error("getNetwork timed out.");
    try {
      if (httpProtocols.includes(url.protocol)) {
        // add the options to avoid the error `Too many eth_getLogs methods in the batch`
        // ref: https://github.com/ethers-io/ethers.js/discussions/4130#discussioncomment-6126545
        const jsonRpcApiProviderOptions: JsonRpcApiProviderOptions = {
          batchMaxSize: 1,
          // `true` keeps the chain ID once it is known, instead of asking it for
          // each request. Do not pass targetNetwork: then it is never asked.
          staticNetwork: true,
        };
        nodeProvider = new JsonRpcProviderKeepingBlockTimestamps(
          rpc,
          jsonRpcApiProviderOptions,
        );
      } else {
        // It opens the socket at once, and that can throw.
        nodeProvider = new WebSocketProviderKeepingBlockTimestamps(rpc);
      }
      const providedNetwork: Network = await Promise.race([
        nodeProvider.getNetwork(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(timeoutError),
            GET_NETWORK_TIMEOUT_MS,
          );
        }),
      ]);
      if (providedNetwork.chainId === targetNetwork.chainId) {
        nodeStatus = "SUCCESS";
        customLogger.success("nodeProvider.getNetwork().", {
          network: providedNetwork,
          options: {
            batchMaxCount: nodeProvider._getOption("batchMaxCount"),
            batchMaxSize: nodeProvider._getOption("batchMaxSize"),
            batchStallTime: nodeProvider._getOption("batchStallTime"),
            cacheTimeout: nodeProvider._getOption("cacheTimeout"),
            polling: nodeProvider._getOption("polling"),
            pollingInterval: nodeProvider._getOption("pollingInterval"),
            staticNetwork: nodeProvider._getOption("staticNetwork"),
          },
        });
      } else {
        nodeStatus = "WRONG_CHAIN";
      }
    } catch (error) {
      customLogger.error(
        "nodeProvider.getNetwork().",
        error === timeoutError
          ? error
          : getLoggableError(error, { onlyNames: true }),
      );
      nodeStatus = "NETWORK_ERROR";
    } finally {
      clearTimeout(timeoutId);
    }
  } else {
    customLogger.error(
      `protocol should be [http / https / ws / wss]. RPC host:`,
      url.host,
    );
    nodeStatus = "INVALID_PROTOCOL";
  }
  try {
    if (latestNodeProviderCalls[targetChain.name] === callNumber) {
      await updateDbItemChainStatus(targetChain.name, "nodeStatus", nodeStatus);
    } else if (
      callNumber > (skippedNodeStatuses[targetChain.name]?.callNumber ?? 0)
    ) {
      skippedNodeStatuses[targetChain.name] = { callNumber, nodeStatus };
    }
  } catch (error) {
    // A WebSocket would stay open.
    await destroyNodeProvider(nodeProvider);
    throw error;
  }
  if (nodeStatus !== "SUCCESS") {
    await destroyNodeProvider(nodeProvider);
    return undefined;
  }
  return nodeProvider;
}
// Does not throw, so that the caller goes on with its own result or error.
async function destroyNodeProvider(
  nodeProvider: NodeProvider | undefined,
): Promise<void> {
  try {
    await nodeProvider?.destroy();
  } catch (error) {
    customLogger.error(
      "nodeProvider.destroy().",
      getLoggableError(error, { onlyNames: true }),
    );
  }
}
// The causes followed, so that a cause that loops also ends.
const MAX_CAUSE_DEPTH: number = 5;
// ethers puts the request URL, which may hold an API key, in the message and
// the properties of its errors. Another error becomes a plain object of a few
// fields, whose cause and inner error (of Dexie) are cleaned the same way.
// onlyNames keeps only the names of the errors and the types of the other
// values, for an error whose message may have the URL, such as the
// DOMException of a WebSocket that cannot be made.
export function getLoggableError(
  error: unknown,
  { onlyNames = false }: { onlyNames?: boolean } = {},
): unknown {
  return getLoggableErrorAt(error, 0, onlyNames);
}
function getLoggableErrorAt(
  error: unknown,
  depth: number,
  onlyNames: boolean,
): unknown {
  if (!(error instanceof Error)) {
    return onlyNames ? { type: typeof error } : error;
  }
  if (depth > MAX_CAUSE_DEPTH) return "(more causes)";
  if (!("code" in error && "shortMessage" in error)) {
    const inner: unknown = "inner" in error ? error.inner : undefined;
    return {
      name: error.name,
      ...(onlyNames ? {} : { message: error.message, stack: error.stack }),
      ...(error.cause === undefined
        ? {}
        : { cause: getLoggableErrorAt(error.cause, depth + 1, onlyNames) }),
      ...(inner === undefined
        ? {}
        : { inner: getLoggableErrorAt(inner, depth + 1, onlyNames) }),
    };
  }
  const loggableError = { code: error.code, shortMessage: error.shortMessage };
  // The error in the JSON-RPC response, which tells why the RPC failed.
  if (
    error.code === "UNKNOWN_ERROR" &&
    "error" in error &&
    isJsonRpcError(error.error)
  ) {
    return {
      ...loggableError,
      rpcError: { code: error.error.code, message: error.error.message },
    };
  }
  return loggableError;
}
// Errors of a node without old blocks, which come for any width. Seen with
// Pocket Network on Ethereum (#580): 209 of 405 errors in 1,821 requests.
const ERRORS_UNRELATED_TO_RANGE: string[] = [
  "historical state is not available",
  "pruned history unavailable",
  "old data not available due to pruning",
];
// An error that may not come again for the same range: HTTP 500 or 504 (such
// as a relay that failed), or a node without old blocks behind the RPC.
export function isErrorUnrelatedToRange(error: unknown): boolean {
  if (isError(error, "SERVER_ERROR")) {
    const statusCode: number | undefined = error.response?.statusCode;
    return statusCode === 500 || statusCode === 504;
  }
  // The error in the JSON-RPC response, as in getLoggableError.
  if (!(isError(error, "UNKNOWN_ERROR") && isJsonRpcError(error.error))) {
    return false;
  }
  const rpcMessage: string = error.error.message;
  return ERRORS_UNRELATED_TO_RANGE.some((message: string) =>
    rpcMessage.includes(message),
  );
}
function isJsonRpcError(
  value: unknown,
): value is { code: number; message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "number" &&
    "message" in value &&
    typeof value.message === "string"
  );
}
export async function getAndUpdateLatestBlockNumber(
  nodeProvider: NodeProvider,
  chainName: ChainName,
): Promise<number> {
  // Blocks within the confirmation depth can still be replaced by a chain
  // reorganization, so the sync does not go past them.
  const latestBlockNumber: number = Math.max(
    0,
    (await nodeProvider.getBlockNumber()) -
      getTargetChain({ chainName }).confirmationBlocks,
  );
  await updateDbItemChainStatus(
    chainName,
    "latestBlockNumber",
    latestBlockNumber,
  );
  return latestBlockNumber;
}

export async function getEthersEventLogs(
  eventNames: EventAbiFragment["name"][],
  ethersContract: EthersContract,
  fromBlock: number,
  toBlock: number,
): Promise<EthersEventLog[]> {
  // An empty OR list would match all the logs of the address.
  if (eventNames.length === 0) {
    return [];
  }
  return await queryFilter(ethersContract, eventNames, fromBlock, toBlock);
}

// One eth_getLogs for all the events: the nested array is an OR on topic 0,
// and ethers decodes each log with the event of its topic 0.
async function queryFilter(
  ethersContract: EthersContract,
  eventNames: string[],
  fromBlock: number,
  toBlock: number,
): Promise<EthersEventLog[]> {
  const logs: Array<EventLog | Log> = await ethersContract.queryFilter(
    [eventNames],
    fromBlock,
    toBlock,
  );
  return extractDecodedEventLogs(logs);
}

// Logs that could not be decoded (e.g. "UndecodedEventLog") are skipped
// so that they are not registered under a wrong event name.
export function extractDecodedEventLogs(
  logs: Array<EventLog | Log>,
): EthersEventLog[] {
  const decodedEventLogs: EthersEventLog[] = [];
  for (const log of logs) {
    if (log instanceof EventLog) {
      decodedEventLogs.push(log);
    } else {
      customLogger.error("Skip an event log that could not be decoded.", {
        topic0: log.topics[0],
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.index,
      });
    }
  }
  return decodedEventLogs;
}
