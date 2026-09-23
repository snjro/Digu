import type { Chain, ChainName, Contract } from "@constants/chains/types";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import {
  extractDecodedEventLogs,
  extractEventContracts,
  getAndUpdateLatestBlockNumber,
  getEthersEventLogs,
  getNodeProvider,
  type NodeProvider,
} from "./utilsEthers";
import { convertJsonFilesContractToContracts } from "@constants/chains/convertJsonToABI";
import { TARGET_CHAINS } from "@constants/chains/_index";
import * as dbChainStatusDataHandlers from "@db/dbChainStatusDataHandlers";
import type { ChainStatus, EthersEventLog } from "@db/dbTypes";
import {
  EventLog,
  JsonRpcProvider,
  Log,
  Network,
  UndecodedEventLog,
  WebSocketProvider,
  ethers,
  type Contract as EthersContract,
  type Provider,
} from "ethers";
import { customLogger } from "./logger";
import { jsonFileContracts } from "./testCommon";
const targetChainName: ChainName = "matic";
const targetChain: Chain = TARGET_CHAINS.find(
  (chain: Chain) => chain.name === targetChainName,
)!;
let spyUpdateDbItemChainStatus: any;

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
  let spyJsonRpcGetNetwork: any;
  let spyWebSocketGetNetWork: any;
  beforeAll(() => {
    spyJsonRpcGetNetwork = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockImplementationOnce(() => {
        throw new Error(); // To increase coverage, make an error only once at the beginning
      })
      .mockResolvedValue(new Network("", BigInt(targetChain.chainId)));

    spyWebSocketGetNetWork = vi
      .spyOn(WebSocketProvider.prototype, "getNetwork")
      .mockResolvedValue(new Network("", BigInt(targetChain.chainId)));
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
  };
  const rpcDefinitions: RpcDefinition[] = [
    {
      rpc: "https://foo",
      state: "error throw",
      lastNodeStatus: "NETWORK_ERROR",
    },
    {
      rpc: "https://bar",
      state: "valid URL(https)",
      lastNodeStatus: "SUCCESS",
    },
    {
      rpc: "wss://socketsbay.com/wss/v2/1/demo/",
      state: "valid URL(wss)",
      lastNodeStatus: "SUCCESS",
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
    async ({ rpc, lastNodeStatus, targetChainId }: RpcDefinition) => {
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
      if (lastNodeStatus === "SUCCESS") {
        expect(nodeProvider).toBeDefined();
      } else {
        expect(nodeProvider).toBeUndefined();
      }
    },
  );
});

describe("getAndUpdateLatestBlockNumber", () => {
  let nodeProvider: NodeProvider | undefined;
  let spyGetBlockNumber: any;
  const expectedLatestBlockNumber: number = 1;
  beforeAll(async () => {
    nodeProvider = new JsonRpcProvider();
    spyGetBlockNumber = vi
      .spyOn(nodeProvider, "getBlockNumber")
      .mockResolvedValue(expectedLatestBlockNumber);
  });
  afterAll(() => spyGetBlockNumber.mockRestore());
  test("should get latestBlockNumber", async () => {
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
});
describe("getEthersEventLogs", async () => {
  let targetContract: Contract;
  let nodeProvider: NodeProvider | undefined;
  let ethersContract: EthersContract;

  let sypQueryFilter: any;

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
