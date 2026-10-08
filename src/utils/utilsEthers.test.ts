import type { Chain, ChainName, Contract } from "#constants/chains/types.js";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type MockInstance,
} from "vitest";
import {
  cancelNodeProviderCall,
  extractDecodedEventLogs,
  extractEventContracts,
  forgetBlockTimestampsFromLogs,
  getAndUpdateLatestBlockNumber,
  getBlockTimestampFromLogs,
  getEthersEventLogs,
  getLoggableError,
  getNodeProvider,
  isErrorUnrelatedToRange,
  startNodeProviderCall,
  type NodeProvider,
} from "./utilsEthers";
import { convertJsonFilesContractToContracts } from "#constants/chains/convertJsonToABI.js";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import * as dbChainStatusDataHandlers from "#db/dbChainStatusDataHandlers.js";
import type { ChainStatus, EthersEventLog } from "#db/dbTypes.js";
import {
  EventLog,
  FetchRequest,
  JsonRpcProvider,
  Log,
  Network,
  UndecodedEventLog,
  WebSocketProvider,
  ethers,
  makeError,
  type Contract as EthersContract,
  type Filter,
  toQuantity,
  type JsonRpcApiProviderOptions,
  type JsonRpcPayload,
  type JsonRpcResult,
  type LogParams,
  type Networkish,
  type Provider,
  type WebSocketLike,
} from "ethers";
import { customLogger } from "./logger";
import {
  jsonFileContracts,
  providerAnsweringGetLogs,
  type GetLogsAnswer,
} from "./testCommon";

// The WebSocketProvider made in getNodeProvider uses a socket that never
// opens, so that the tests do not connect to anywhere.
vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();
  class FakeSocketWebSocketProvider extends actual.WebSocketProvider {
    constructor(
      _url: string,
      network?: Networkish,
      options?: JsonRpcApiProviderOptions,
    ) {
      super(
        (): WebSocketLike => ({
          onopen: null,
          onmessage: null,
          onerror: null,
          readyState: 0,
          send: () => {},
          close: () => {},
        }),
        network,
        options,
      );
    }
  }
  return { ...actual, WebSocketProvider: FakeSocketWebSocketProvider };
});
const targetChainName: ChainName = "matic";
const targetChain: Chain = TARGET_CHAINS.find(
  (chain: Chain) => chain.name === targetChainName,
)!;
let spyUpdateDbItemChainStatus: MockInstance;

beforeAll(() => {
  spyUpdateDbItemChainStatus = vi
    .spyOn(dbChainStatusDataHandlers, "updateDbItemChainStatus")
    .mockResolvedValue();
});
afterAll(() => {
  vi.restoreAllMocks();
});
describe("extractEventContracts", () => {
  test("should return contracts that have events", () => {
    const targetContracts: Contract[] =
      convertJsonFilesContractToContracts(jsonFileContracts);
    const expectedContracts: Contract[] = convertJsonFilesContractToContracts([
      jsonFileContracts[0],
    ]);
    const actualContracts: Contract[] = extractEventContracts(targetContracts);

    expect(actualContracts).toEqual(expectedContracts);
  });

  test("should return an empty array if no contracts have events", () => {
    const targetContracts: Contract[] = convertJsonFilesContractToContracts([
      jsonFileContracts[1],
      jsonFileContracts[2],
    ]);
    const expectedContracts: Contract[] = [];
    const actualContracts: Contract[] = extractEventContracts(targetContracts);

    expect(actualContracts).toEqual(expectedContracts);
  });
  test("should return an empty array if an empty array passed", () => {
    const targetContracts: Contract[] = [];
    const expectedContracts: Contract[] = [];
    const actualContracts: Contract[] = extractEventContracts(targetContracts);

    expect(actualContracts).toEqual(expectedContracts);
  });
});

describe("getNodeProvider", async () => {
  let spyJsonRpcGetNetwork: MockInstance;
  let spyWebSocketGetNetWork: MockInstance;
  beforeAll(() => {
    spyJsonRpcGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockResolvedValue(new Network("", BigInt(targetChain.chainId)));

    spyWebSocketGetNetWork = vi
      .spyOn(WebSocketProvider.prototype, "getNetwork")
      .mockResolvedValue(new Network("", BigInt(targetChain.chainId)));
  });
  beforeEach(() => {
    spyUpdateDbItemChainStatus.mockClear();
  });
  afterAll(() => {
    spyJsonRpcGetNetwork.mockRestore();
    spyWebSocketGetNetWork.mockRestore();
  });
  type RpcDefinition = {
    rpc: string;
    state: string;
    lastNodeStatus: ChainStatus["nodeStatus"];
    targetChainId?: Chain["chainId"];
    providerClass?: typeof JsonRpcProvider | typeof WebSocketProvider;
    getNetworkFails?: boolean;
  };
  const rpcDefinitions: RpcDefinition[] = [
    {
      rpc: "https://foo",
      state: "error throw",
      lastNodeStatus: "NETWORK_ERROR",
      getNetworkFails: true,
    },
    {
      rpc: "https://bar",
      state: "valid URL(https)",
      lastNodeStatus: "SUCCESS",
      providerClass: JsonRpcProvider,
    },
    {
      rpc: "wss://127.0.0.1:9",
      state: "valid URL(wss)",
      lastNodeStatus: "SUCCESS",
      providerClass: WebSocketProvider,
    },
    { rpc: "invalid_url", state: "invalid URL", lastNodeStatus: "INVALID_URL" },
    {
      rpc: "https://fuga",
      state: "wrong chainID",
      lastNodeStatus: "WRONG_CHAIN",
      targetChainId: 999,
    },
    {
      rpc: "foo://xxx",
      state: "wrong protocol",
      lastNodeStatus: "INVALID_PROTOCOL",
    },
  ];
  test.each(rpcDefinitions)(
    `Condition: $state`,
    async ({
      rpc,
      lastNodeStatus,
      targetChainId,
      providerClass,
      getNetworkFails,
    }: RpcDefinition) => {
      if (getNetworkFails) {
        spyJsonRpcGetNetwork.mockRejectedValueOnce(new Error());
      }
      // edit property of targetChain
      const editedTargetChain: Chain = targetChainId
        ? { ...targetChain, chainId: targetChainId }
        : targetChain;

      // call test target function
      const nodeProvider = await getNodeProvider(editedTargetChain, rpc);

      //check 1st nodeStatus
      expect(spyUpdateDbItemChainStatus).toHaveBeenNthCalledWith<
        [ChainName, "nodeStatus", ChainStatus["nodeStatus"]]
      >(1, targetChainName, "nodeStatus", "CONNECTING");

      //check last nodeStatus
      expect(spyUpdateDbItemChainStatus).toHaveBeenLastCalledWith<
        [ChainName, "nodeStatus", ChainStatus["nodeStatus"]]
      >(targetChainName, "nodeStatus", lastNodeStatus);

      // check return value
      if (providerClass) {
        expect(nodeProvider).toBeInstanceOf(providerClass);
      } else {
        expect(nodeProvider).toBeUndefined();
      }
      await nodeProvider?.destroy();
    },
  );
});

describe("getNodeProvider destroys and orders", () => {
  function deferredNetwork(): {
    promise: Promise<Network>;
    resolve: (network: Network) => void;
  } {
    let resolve: (network: Network) => void = () => {};
    const promise = new Promise<Network>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  }
  const targetNetwork = (): Network =>
    new Network("", BigInt(targetChain.chainId));

  test("should destroy the provider when the node is not ready", async () => {
    const spyGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockRejectedValueOnce(new Error());
    const spyDestroy = vi.spyOn(JsonRpcProvider.prototype, "destroy");
    expect(await getNodeProvider(targetChain, "https://foo")).toBeUndefined();
    expect(spyDestroy).toHaveBeenCalledTimes(1);
    spyGetNetwork.mockRestore();
    spyDestroy.mockRestore();
  });

  test("should not destroy the provider it returns", async () => {
    const spyGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockResolvedValueOnce(targetNetwork());
    const spyDestroy = vi.spyOn(JsonRpcProvider.prototype, "destroy");
    const nodeProvider = await getNodeProvider(targetChain, "https://bar");
    expect(nodeProvider).toBeInstanceOf(JsonRpcProvider);
    expect(spyDestroy).not.toHaveBeenCalled();
    await nodeProvider?.destroy();
    spyGetNetwork.mockRestore();
    spyDestroy.mockRestore();
  });

  test("should not write the status of an earlier call that ends last", async () => {
    const earlier = deferredNetwork();
    const later = deferredNetwork();
    const spyGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockReturnValueOnce(earlier.promise)
      .mockReturnValueOnce(later.promise);
    spyUpdateDbItemChainStatus.mockClear();

    const earlierCall = getNodeProvider(targetChain, "https://earlier");
    const laterCall = getNodeProvider(targetChain, "https://later");
    later.resolve(targetNetwork());
    const laterProvider = await laterCall;
    earlier.resolve(new Network("", BigInt(999)));
    await earlierCall;

    expect(spyUpdateDbItemChainStatus).toHaveBeenLastCalledWith(
      targetChainName,
      "nodeStatus",
      "SUCCESS",
    );
    expect(spyUpdateDbItemChainStatus).not.toHaveBeenCalledWith(
      targetChainName,
      "nodeStatus",
      "WRONG_CHAIN",
    );
    await laterProvider?.destroy();
    spyGetNetwork.mockRestore();
  });

  test("should return the provider of an earlier call that succeeds and ends last", async () => {
    const earlier = deferredNetwork();
    const later = deferredNetwork();
    const spyGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockReturnValueOnce(earlier.promise)
      .mockReturnValueOnce(later.promise);
    const spyDestroy = vi.spyOn(JsonRpcProvider.prototype, "destroy");
    spyUpdateDbItemChainStatus.mockClear();

    const earlierCall = getNodeProvider(targetChain, "https://earlier");
    const laterCall = getNodeProvider(targetChain, "https://later");
    later.resolve(new Network("", BigInt(999)));
    expect(await laterCall).toBeUndefined();
    earlier.resolve(targetNetwork());
    const earlierProvider = await earlierCall;

    expect(earlierProvider).toBeInstanceOf(JsonRpcProvider);
    // Only the provider of the later call is destroyed.
    expect(spyDestroy).toHaveBeenCalledTimes(1);
    expect(spyUpdateDbItemChainStatus).toHaveBeenLastCalledWith(
      targetChainName,
      "nodeStatus",
      "WRONG_CHAIN",
    );
    expect(spyUpdateDbItemChainStatus).not.toHaveBeenCalledWith(
      targetChainName,
      "nodeStatus",
      "SUCCESS",
    );
    await earlierProvider?.destroy();
    spyGetNetwork.mockRestore();
    spyDestroy.mockRestore();
  });

  test("should not write CONNECTING again for a started call", async () => {
    const spyGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockResolvedValueOnce(targetNetwork());
    spyUpdateDbItemChainStatus.mockClear();

    const callNumber = await startNodeProviderCall(targetChainName);
    const nodeProvider = await getNodeProvider(
      targetChain,
      "https://bar",
      callNumber,
    );

    expect(spyUpdateDbItemChainStatus.mock.calls).toEqual([
      [targetChainName, "nodeStatus", "CONNECTING"],
      [targetChainName, "nodeStatus", "SUCCESS"],
    ]);
    await nodeProvider?.destroy();
    spyGetNetwork.mockRestore();
  });

  test("should not write the status of an earlier call after a started call", async () => {
    const earlier = deferredNetwork();
    const later = deferredNetwork();
    const spyGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockReturnValueOnce(earlier.promise)
      .mockReturnValueOnce(later.promise);
    spyUpdateDbItemChainStatus.mockClear();

    const earlierCall = getNodeProvider(targetChain, "https://earlier");
    const callNumber = await startNodeProviderCall(targetChainName);
    // The earlier call ends between CONNECTING and the later getNodeProvider.
    earlier.resolve(new Network("", BigInt(999)));
    await earlierCall;
    const laterCall = getNodeProvider(targetChain, "https://later", callNumber);
    later.resolve(targetNetwork());
    const laterProvider = await laterCall;

    expect(spyUpdateDbItemChainStatus.mock.calls).toEqual([
      [targetChainName, "nodeStatus", "CONNECTING"],
      [targetChainName, "nodeStatus", "CONNECTING"],
      [targetChainName, "nodeStatus", "SUCCESS"],
    ]);
    await laterProvider?.destroy();
    spyGetNetwork.mockRestore();
  });

  test("should write the previous status when a started call is canceled", async () => {
    spyUpdateDbItemChainStatus.mockClear();

    const callNumber = await startNodeProviderCall(targetChainName);
    await cancelNodeProviderCall(targetChainName, callNumber, "INVALID_URL");

    expect(spyUpdateDbItemChainStatus.mock.calls).toEqual([
      [targetChainName, "nodeStatus", "CONNECTING"],
      [targetChainName, "nodeStatus", "INVALID_URL"],
    ]);
  });

  test("should let an earlier call write its status after a cancel", async () => {
    const earlier = deferredNetwork();
    const spyGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockReturnValueOnce(earlier.promise);
    spyUpdateDbItemChainStatus.mockClear();

    const earlierCall = getNodeProvider(targetChain, "https://earlier");
    const callNumber = await startNodeProviderCall(targetChainName);
    await cancelNodeProviderCall(targetChainName, callNumber, "CONNECTING");
    earlier.resolve(new Network("", BigInt(999)));
    await earlierCall;

    expect(spyUpdateDbItemChainStatus).toHaveBeenLastCalledWith(
      targetChainName,
      "nodeStatus",
      "WRONG_CHAIN",
    );
    spyGetNetwork.mockRestore();
  });

  test("should write the status of an earlier call that ended before a cancel", async () => {
    const earlier = deferredNetwork();
    const spyGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockReturnValueOnce(earlier.promise);
    spyUpdateDbItemChainStatus.mockClear();

    const earlierCall = getNodeProvider(targetChain, "https://earlier");
    const callNumber = await startNodeProviderCall(targetChainName);
    earlier.resolve(new Network("", BigInt(999)));
    await earlierCall;
    await cancelNodeProviderCall(targetChainName, callNumber, "CONNECTING");

    expect(spyUpdateDbItemChainStatus.mock.calls).toEqual([
      [targetChainName, "nodeStatus", "CONNECTING"],
      [targetChainName, "nodeStatus", "CONNECTING"],
      [targetChainName, "nodeStatus", "WRONG_CHAIN"],
    ]);
    spyGetNetwork.mockRestore();
  });

  test("should write the status of the newest earlier call that ended before a cancel", async () => {
    const oldest = deferredNetwork();
    const earlier = deferredNetwork();
    const spyGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockReturnValueOnce(oldest.promise)
      .mockReturnValueOnce(earlier.promise);
    spyUpdateDbItemChainStatus.mockClear();

    const oldestCall = getNodeProvider(targetChain, "https://oldest");
    const earlierCall = getNodeProvider(targetChain, "https://earlier");
    const callNumber = await startNodeProviderCall(targetChainName);
    earlier.resolve(new Network("", BigInt(999)));
    await earlierCall;
    // The oldest call ends last, but it was not the newest one.
    oldest.resolve(targetNetwork());
    const oldestProvider = await oldestCall;
    await cancelNodeProviderCall(targetChainName, callNumber, "CONNECTING");

    expect(spyUpdateDbItemChainStatus).toHaveBeenLastCalledWith(
      targetChainName,
      "nodeStatus",
      "WRONG_CHAIN",
    );
    await oldestProvider?.destroy();
    spyGetNetwork.mockRestore();
  });

  test("should not write when a newer call started before the cancel", async () => {
    spyUpdateDbItemChainStatus.mockClear();

    const callNumber = await startNodeProviderCall(targetChainName);
    await startNodeProviderCall(targetChainName);
    await cancelNodeProviderCall(targetChainName, callNumber, "INVALID_URL");

    expect(spyUpdateDbItemChainStatus.mock.calls).toEqual([
      [targetChainName, "nodeStatus", "CONNECTING"],
      [targetChainName, "nodeStatus", "CONNECTING"],
    ]);
  });
});

describe("getNodeProvider logs", () => {
  test("should log only the code and the short message of an ethers error", async () => {
    const spyGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockRejectedValueOnce(
        makeError("server response 401 Unauthorized", "SERVER_ERROR", {
          request: new FetchRequest("https://rpc.example/secret-key"),
          info: { requestUrl: "https://rpc.example/secret-key" },
        }),
      );
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});

    await getNodeProvider(targetChain, "https://rpc.example/secret-key");

    expect(spyError).toHaveBeenCalledExactlyOnceWith(
      "nodeProvider.getNetwork().",
      {
        code: "SERVER_ERROR",
        shortMessage: "server response 401 Unauthorized",
      },
    );
    spyGetNetwork.mockRestore();
    spyError.mockRestore();
  });

  test("should log only the host of an RPC with a wrong protocol", async () => {
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});

    await getNodeProvider(
      targetChain,
      "foo://user:secret@rpc.example:8545/secret-key?key=secret",
    );

    expect(spyError).toHaveBeenCalledExactlyOnceWith(
      "protocol should be [http / https / ws / wss]. RPC host:",
      "rpc.example:8545",
    );
    spyError.mockRestore();
  });

  test("should log only the name of an error that is not from ethers", async () => {
    // Like the DOMException of a WebSocket that cannot be made.
    const spyGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockRejectedValueOnce(
        new DOMException(
          "The URL 'wss://rpc.example/secret-key' is invalid.",
          "SyntaxError",
        ),
      );
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});

    await getNodeProvider(targetChain, "https://rpc.example/secret-key");

    expect(spyError).toHaveBeenCalledExactlyOnceWith(
      "nodeProvider.getNetwork().",
      { name: "SyntaxError" },
    );
    spyGetNetwork.mockRestore();
    spyError.mockRestore();
  });

  test("should log the timeout of getNetwork as it is", async () => {
    vi.useFakeTimers();
    const spyGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockReturnValueOnce(new Promise<Network>(() => {}));
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});

    const promise = getNodeProvider(targetChain, "https://rpc.example");
    await vi.runAllTimersAsync();
    await promise;

    expect(spyError).toHaveBeenCalledExactlyOnceWith(
      "nodeProvider.getNetwork().",
      new Error("getNetwork timed out."),
    );
    vi.useRealTimers();
    spyGetNetwork.mockRestore();
    spyError.mockRestore();
  });
});

describe("getLoggableError", () => {
  test("should keep the code and the message of the error that the RPC returned", () => {
    const error: Error = makeError(
      "could not coalesce error",
      "UNKNOWN_ERROR",
      {
        error: { code: -32000, message: "temporary error" },
        payload: { method: "eth_getLogs", params: [], id: 1, jsonrpc: "2.0" },
      },
    );
    expect(getLoggableError(error)).toStrictEqual({
      code: "UNKNOWN_ERROR",
      shortMessage: "could not coalesce error",
      rpcError: { code: -32000, message: "temporary error" },
    });
  });

  test("should keep only the code and the short message of an HTTP error", () => {
    const error: Error = makeError(
      "server response 401 Unauthorized",
      "SERVER_ERROR",
      {
        request: new FetchRequest("https://rpc.example/secret-key"),
        error: new Error("https://rpc.example/secret-key"),
        info: {
          requestUrl: "https://rpc.example/secret-key",
          responseBody: "invalid key",
        },
      },
    );
    expect(getLoggableError(error)).toStrictEqual({
      code: "SERVER_ERROR",
      shortMessage: "server response 401 Unauthorized",
    });
  });

  test.each([new Error("DB error"), "text", undefined])(
    "should return %s as it is when it is not an ethers error",
    (error: unknown) => {
      expect(getLoggableError(error)).toBe(error);
    },
  );
});

describe("isErrorUnrelatedToRange", () => {
  // The error that ethers throws for the answer of the RPC.
  async function errorOf(answer: GetLogsAnswer): Promise<unknown> {
    const { provider } = providerAnsweringGetLogs(1, () => answer);
    try {
      await provider.send("eth_getLogs", [
        { fromBlock: "0x1", toBlock: "0x2" },
      ]);
    } catch (error) {
      return error;
    } finally {
      provider.destroy();
    }
    throw new Error("the request did not fail");
  }

  test.each([
    500,
    504,
    "historical state is not available",
    "pruned history unavailable: requested 11849286, earliest available 15500000",
    "old data not available due to pruning: requested block 6134861",
  ])("should be true for %s", async (answer: GetLogsAnswer) => {
    expect(isErrorUnrelatedToRange(await errorOf(answer))).toBe(true);
  });

  test.each([
    400,
    502,
    503,
    "query exceeds max block range 10000",
    "query exceeds max results 5000, retry with the range 5934929-5935049",
  ])("should be false for %s", async (answer: GetLogsAnswer) => {
    expect(isErrorUnrelatedToRange(await errorOf(answer))).toBe(false);
  });

  // A browser gives no response for an error without CORS headers.
  test.each([new TypeError("Failed to fetch"), "text", undefined])(
    "should be false for %s, which is not an error of the RPC",
    (error: unknown) => {
      expect(isErrorUnrelatedToRange(error)).toBe(false);
    },
  );
});

describe("getAndUpdateLatestBlockNumber", () => {
  let nodeProvider: NodeProvider | undefined;
  let spyGetBlockNumber: MockInstance;
  const rpcLatestBlockNumber: number = 1000;
  beforeAll(async () => {
    nodeProvider = new JsonRpcProvider();
    spyGetBlockNumber = vi
      .spyOn(nodeProvider, "getBlockNumber")
      .mockResolvedValue(rpcLatestBlockNumber);
  });
  afterAll(() => spyGetBlockNumber.mockRestore());
  test("should get latestBlockNumber", async () => {
    const expectedLatestBlockNumber: number =
      rpcLatestBlockNumber - targetChain.confirmationBlocks;
    const actualLatestBlockNumber: number = await getAndUpdateLatestBlockNumber(
      nodeProvider!,
      targetChainName,
    );
    //check latestBlockNumber
    expect(spyUpdateDbItemChainStatus).toHaveBeenCalledWith<
      [ChainName, "latestBlockNumber", ChainStatus["latestBlockNumber"]]
    >(targetChainName, "latestBlockNumber", expectedLatestBlockNumber);

    expect(actualLatestBlockNumber).toBe(expectedLatestBlockNumber);
  });
  test("should not go below 0 when the chain is shorter than the confirmation depth", async () => {
    spyGetBlockNumber.mockResolvedValueOnce(targetChain.confirmationBlocks - 1);
    const actualLatestBlockNumber: number = await getAndUpdateLatestBlockNumber(
      nodeProvider!,
      targetChainName,
    );
    expect(spyUpdateDbItemChainStatus).toHaveBeenLastCalledWith<
      [ChainName, "latestBlockNumber", ChainStatus["latestBlockNumber"]]
    >(targetChainName, "latestBlockNumber", 0);
    expect(actualLatestBlockNumber).toBe(0);
  });
});
describe("getEthersEventLogs", async () => {
  let targetContract: Contract;
  let nodeProvider: NodeProvider | undefined;
  let ethersContract: EthersContract;

  let sypQueryFilter: MockInstance;

  beforeAll(() => {
    targetContract = convertJsonFilesContractToContracts(jsonFileContracts)[0];
    nodeProvider = undefined;
    ethersContract = new ethers.Contract(
      targetContract.address,
      targetContract.contractInterface.fragments,
      nodeProvider,
    );
    sypQueryFilter = vi
      .spyOn(ethersContract, "queryFilter")
      .mockResolvedValue([]);
  });
  beforeEach(() => {
    sypQueryFilter.mockClear();
  });
  afterAll(() => {
    sypQueryFilter.mockRestore();
  });
  test(`should be called once with all the names as one OR list when the arg "eventNames" is not []`, async () => {
    await getEthersEventLogs(["event1", "event2"], ethersContract, 0, 1);
    expect(sypQueryFilter).toHaveBeenCalledExactlyOnceWith(
      [["event1", "event2"]],
      0,
      1,
    );
  });
  test(`should return [] without a request when the arg "eventNames" is []`, async () => {
    const actualEthersEventLogs: EthersEventLog[] = await getEthersEventLogs(
      [],
      ethersContract,
      0,
      1,
    );
    const expectedEthersEventLogs: EthersEventLog[] = [];
    expect(actualEthersEventLogs).toStrictEqual(expectedEthersEventLogs);
    expect(sypQueryFilter).not.toHaveBeenCalled();
  });
  test("should send one eth_getLogs with an OR on topic 0 and decode each log with its event", async () => {
    const contractInterface = new ethers.Interface([
      "event EventA(address indexed account)",
      "event EventB(uint256 amount)",
    ]);
    const eventA = contractInterface.getEvent("EventA")!;
    const eventB = contractInterface.getEvent("EventB")!;
    const network: Network = Network.from(targetChain.chainId);
    const provider: JsonRpcProvider = new JsonRpcProvider(
      "http://fake-rpc.invalid/",
      network,
      { staticNetwork: network },
    );
    const address: string = "0x" + "1".repeat(40);
    // The order of an RPC: by block number and log index, events mixed.
    const rawLogs = [
      { blockNumber: 10, index: 0, event: eventB, values: [7n] },
      {
        blockNumber: 10,
        index: 1,
        event: eventA,
        values: ["0x0000000000000000000000000000000000000001"],
      },
      { blockNumber: 11, index: 0, event: eventB, values: [8n] },
    ].map(({ blockNumber, index, event, values }) => {
      const { data, topics } = contractInterface.encodeEventLog(event, values);
      return new Log(
        {
          transactionHash: `0x${blockNumber.toString(16).padStart(64, "a")}`,
          blockHash: `0x${blockNumber.toString(16).padStart(64, "b")}`,
          blockNumber,
          removed: false,
          address,
          data,
          topics,
          index,
          transactionIndex: 0,
        },
        provider,
      );
    });
    const spyGetLogs = vi.spyOn(provider, "getLogs").mockResolvedValue(rawLogs);
    const ethersContract: EthersContract = new ethers.Contract(
      address,
      contractInterface,
      provider,
    );

    const actual: EthersEventLog[] = await getEthersEventLogs(
      ["EventA", "EventB"],
      ethersContract,
      0,
      1,
    );

    expect(spyGetLogs).toHaveBeenCalledOnce();
    const { topics, ...filter } = spyGetLogs.mock.calls[0][0] as Filter;
    expect(filter).toEqual({ address, fromBlock: 0, toBlock: 1 });
    // ethers sorts the OR list on topic 0, so the order is not compared.
    expect(topics).toHaveLength(1);
    expect(topics![0]).toHaveLength(2);
    expect(topics![0]).toEqual(
      expect.arrayContaining([eventA.topicHash, eventB.topicHash]),
    );
    expect(
      actual.map((log) => [
        log.eventName,
        log.blockNumber,
        log.index,
        log.args[0],
      ]),
    ).toEqual([
      ["EventB", 10, 0, 7n],
      ["EventA", 10, 1, "0x0000000000000000000000000000000000000001"],
      ["EventB", 11, 0, 8n],
    ]);
    spyGetLogs.mockRestore();
    await provider.destroy();
  });
});

describe("getBlockTimestampFromLogs", () => {
  let spyJsonRpcGetNetwork: MockInstance;
  let spyWebSocketGetNetWork: MockInstance;
  beforeAll(() => {
    spyJsonRpcGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockResolvedValue(new Network("", BigInt(targetChain.chainId)));
    spyWebSocketGetNetWork = vi
      .spyOn(WebSocketProvider.prototype, "getNetwork")
      .mockResolvedValue(new Network("", BigInt(targetChain.chainId)));
  });
  afterAll(() => {
    spyJsonRpcGetNetwork.mockRestore();
    spyWebSocketGetNetWork.mockRestore();
  });
  const contractInterface = new ethers.Interface([
    "event EventB(uint256 amount)",
  ]);
  const address: string = "0x" + "1".repeat(40);
  // A log as an RPC returns it, with or without blockTimestamp.
  function rawLog(
    blockNumber: number,
    blockTimestamp?: number,
  ): Record<string, unknown> {
    const { data, topics } = contractInterface.encodeEventLog(
      contractInterface.getEvent("EventB")!,
      [7n],
    );
    return {
      address,
      data,
      topics,
      blockNumber: toQuantity(blockNumber),
      blockHash: `0x${blockNumber.toString(16).padStart(64, "b")}`,
      transactionHash: `0x${blockNumber.toString(16).padStart(64, "a")}`,
      transactionIndex: "0x0",
      logIndex: "0x0",
      removed: false,
      ...(blockTimestamp === undefined
        ? {}
        : { blockTimestamp: toQuantity(blockTimestamp) }),
    };
  }

  test("should keep the blockTimestamp of the logs of eth_getLogs", async () => {
    const nodeProvider = (await getNodeProvider(
      targetChain,
      "https://bar",
    )) as JsonRpcProvider;
    vi.spyOn(nodeProvider, "_send").mockImplementation(
      async (
        payload: JsonRpcPayload | JsonRpcPayload[],
      ): Promise<JsonRpcResult[]> =>
        [payload].flat().map((request: JsonRpcPayload) => {
          if (request.method !== "eth_getLogs") {
            throw new Error(`unexpected method: ${request.method}`);
          }
          return { id: request.id, result: [rawLog(10, 1000), rawLog(11)] };
        }),
    );
    const ethersContract: EthersContract = new ethers.Contract(
      address,
      contractInterface,
      nodeProvider,
    );

    const logs: EthersEventLog[] = await getEthersEventLogs(
      ["EventB"],
      ethersContract,
      10,
      11,
    );

    expect(logs).toHaveLength(2);
    expect(getBlockTimestampFromLogs(nodeProvider, 10)).toBe(1000);
    // No blockTimestamp in the log.
    expect(getBlockTimestampFromLogs(nodeProvider, 11)).toBeUndefined();
    await nodeProvider.destroy();
  });

  test("should keep the blockTimestamp for each provider, also for a WebSocket", async () => {
    const webSocketProvider = (await getNodeProvider(
      targetChain,
      "wss://127.0.0.1:9",
    ))!;
    const otherProvider = (await getNodeProvider(targetChain, "https://bar"))!;

    webSocketProvider._wrapLog(
      rawLog(10, 1000) as unknown as LogParams,
      Network.from(targetChain.chainId),
    );

    expect(webSocketProvider).toBeInstanceOf(WebSocketProvider);
    expect(getBlockTimestampFromLogs(webSocketProvider, 10)).toBe(1000);
    expect(getBlockTimestampFromLogs(otherProvider, 10)).toBeUndefined();
    await webSocketProvider.destroy();
    await otherProvider.destroy();
  });

  test("should forget only the blockTimestamp of the given blocks", async () => {
    const nodeProvider = (await getNodeProvider(targetChain, "https://bar"))!;
    for (const blockNumber of [10, 11, 12]) {
      nodeProvider._wrapLog(
        rawLog(blockNumber, blockNumber * 100) as unknown as LogParams,
        Network.from(targetChain.chainId),
      );
    }

    forgetBlockTimestampsFromLogs(nodeProvider, [10, 12]);

    expect(getBlockTimestampFromLogs(nodeProvider, 10)).toBeUndefined();
    expect(getBlockTimestampFromLogs(nodeProvider, 11)).toBe(1100);
    expect(getBlockTimestampFromLogs(nodeProvider, 12)).toBeUndefined();
    await nodeProvider.destroy();
  });
});

describe("extractDecodedEventLogs", () => {
  const targetContract: Contract =
    convertJsonFilesContractToContracts(jsonFileContracts)[0];
  const contractInterface = targetContract.contractInterface;
  const eventFragment = contractInterface.getEvent("event1")!;
  const encodedEventLog = contractInterface.encodeEventLog(eventFragment, [
    "0x0000000000000000000000000000000000000001",
  ]);
  const provider = null as unknown as Provider;
  const baseLog = {
    transactionHash: `0x${"a".repeat(64)}`,
    blockHash: `0x${"b".repeat(64)}`,
    blockNumber: 10,
    removed: false,
    address: "0x0000000000000000000000000000000000000011",
    data: encodedEventLog.data,
    topics: encodedEventLog.topics,
    index: 0,
    transactionIndex: 0,
  };
  const eventLog: EventLog = new EventLog(
    new Log(baseLog, provider),
    contractInterface,
    eventFragment,
  );
  const undecodedEventLog: UndecodedEventLog = new UndecodedEventLog(
    new Log({ ...baseLog, data: "0x", index: 1 }, provider),
    new Error("could not decode"),
  );
  const plainLog: Log = new Log({ ...baseLog, index: 2 }, provider);

  test("should return only decoded event logs", () => {
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    const actual: EthersEventLog[] = extractDecodedEventLogs([
      eventLog,
      undecodedEventLog,
      plainLog,
    ]);
    expect(actual).toStrictEqual([eventLog]);
    expect(actual[0].eventName).toBe("event1");
    expect(spyError).toHaveBeenCalledTimes(2);
    expect(spyError).toHaveBeenNthCalledWith(
      1,
      "Skip an event log that could not be decoded.",
      {
        topic0: eventFragment.topicHash,
        blockNumber: 10,
        transactionHash: baseLog.transactionHash,
        logIndex: 1,
      },
    );
    spyError.mockRestore();
  });
  test("should be used by getEthersEventLogs", async () => {
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    const ethersContract: EthersContract = new ethers.Contract(
      targetContract.address,
      targetContract.contractInterface.fragments,
    );
    const spyQueryFilter = vi
      .spyOn(ethersContract, "queryFilter")
      .mockResolvedValue([eventLog, undecodedEventLog]);
    const actual: EthersEventLog[] = await getEthersEventLogs(
      ["event1"],
      ethersContract,
      0,
      1,
    );
    expect(actual).toStrictEqual([eventLog]);
    expect(spyError).toHaveBeenCalledTimes(1);
    spyQueryFilter.mockRestore();
    spyError.mockRestore();
  });
});
