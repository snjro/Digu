import type { Chain, ChainName, Contract } from "@constants/chains/types";
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
  extractDecodedEventLogs,
  extractEventContracts,
  getAndUpdateLatestBlockNumber,
  getEthersEventLogs,
  getLoggableError,
  getNodeProvider,
  type NodeProvider,
} from "./utilsEthers";
import { convertJsonFilesContractToContracts } from "@constants/chains/convertJsonToABI";
import { TARGET_CHAINS } from "@constants/chains/_index";
import * as dbChainStatusDataHandlers from "@db/dbChainStatusDataHandlers";
import type { ChainStatus, EthersEventLog } from "@db/dbTypes";
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
  type JsonRpcApiProviderOptions,
  type Networkish,
  type Provider,
  type WebSocketLike,
} from "ethers";
import { customLogger } from "./logger";
import { jsonFileContracts } from "./testCommon";

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
  afterAll(() => {
    sypQueryFilter.mockRestore();
  });
  test(`should be called with args when the arg "eventNames" is not []`, async () => {
    await getEthersEventLogs(["event1", "event2"], ethersContract, 0, 1);
    expect(sypQueryFilter).toHaveBeenNthCalledWith(1, "event1", 0, 1);
    expect(sypQueryFilter).toHaveBeenNthCalledWith(2, "event2", 0, 1);
  });
  test(`should return [] when the arg "eventNames" is []`, async () => {
    const actualEthersEventLogs: EthersEventLog[] = await getEthersEventLogs(
      [],
      ethersContract,
      0,
      1,
    );
    const expectedEthersEventLogs: EthersEventLog[] = [];
    expect(actualEthersEventLogs).toStrictEqual(expectedEthersEventLogs);
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
    const actual: EthersEventLog[] = extractDecodedEventLogs(
      [eventLog, undecodedEventLog, plainLog],
      "event1",
    );
    expect(actual).toStrictEqual([eventLog]);
    expect(actual[0].eventName).toBe("event1");
    expect(spyError).toHaveBeenCalledTimes(2);
    expect(spyError).toHaveBeenNthCalledWith(
      1,
      "Skip an event log that could not be decoded.",
      {
        eventName: "event1",
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
