import { describe, expect, test, vitest } from "vitest";
import {
  getInitialState,
  syncStateText,
} from "./storeSyncStatusGetInitialState";
import { NO_DATA } from "@utils/utilsCostants";
import type { SyncStateText } from "@db/dbTypes";
import type { Chain } from "@constants/chains/types";
import { convertJsonFilesContractToContracts } from "@constants/chains/convertJsonToABI";
import Augur from "@constants/chains/ethereum-mainnet/augur/version2/Augur.json";
import type { JsonFileContract } from "@constants/chains/jsonFileTypes";

vitest.mock("@constants/chains/_index", (): { TARGET_CHAINS: Chain[] } => {
  return {
    TARGET_CHAINS: [
      {
        name: "eth",
        fullName: "Ethereum Mainnet",
        chain: "ETH",
        icon: "ethereum",
        faucets: [],
        nativeCurrency: {
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
        },
        infoURL: "https://ethereum.org",
        shortName: "eth",
        chainId: 1,
        networkId: 1,
        slip44: 60,
        ens: {
          registry: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
        },
        chainExplorers: [
          {
            name: "Etherscan",
            url: "https://etherscan.io",
            subdirectory: {
              address: "address",
              tx: "tx",
              block: "block",
            },
          },
        ],
        blockIntervalMs: 20000,
        tryCount: 10,
        abortWatchIntervalMs: 5000,
        projects: [
          {
            name: "project1",
            versions: [
              {
                name: "version1",
                contracts: [],
                // contracts: convertJsonFilesContractToContracts([
                //   Augur,
                // ] as JsonFileContract[]),
              },
            ],
          },
        ],
      },
    ],
  };
});

describe("getInitialState", () => {
  test("should return state based on test data", () => {
    expect(getInitialState()).toEqual({
      eth: {
        creationBlockNumber: 0,
        fetchedBlockNumber: 0,
        isAbort: false,
        isSyncTarget: true,
        isSyncing: false,
        name: "eth",
        numOfSyncTargetContract: 0,
        subSyncStatuses: {
          project1: {
            creationBlockNumber: 0,
            fetchedBlockNumber: 0,
            isAbort: false,
            isSyncTarget: true,
            isSyncing: false,
            name: "project1",
            numOfSyncTargetContract: 0,
            subSyncStatuses: {
              version1: {
                creationBlockNumber: 0,
                fetchedBlockNumber: 0,
                isAbort: false,
                isSyncTarget: true,
                isSyncing: false,
                name: "version1",
                numOfSyncTargetContract: 0,
                subSyncStatuses: {},
                syncStateText: "stopped",
              },
            },
            syncStateText: "stopped",
          },
        },
        syncStateText: "stopped",
      },
    });
  });
});
describe("syncStateText", () => {
  type ParamSyncStateText = {
    isSyncing: boolean;
    isAbort: boolean;
    expectedReturnValue: SyncStateText;
  };
  const paramsSyncStateText: ParamSyncStateText[] = [
    { isSyncing: true, isAbort: true, expectedReturnValue: "stopping" },
    { isSyncing: true, isAbort: false, expectedReturnValue: "syncing" },
    { isSyncing: false, isAbort: true, expectedReturnValue: NO_DATA },
    { isSyncing: false, isAbort: false, expectedReturnValue: "stopped" },
  ];

  test.each<ParamSyncStateText>(paramsSyncStateText)(
    `should return text according to the args`,
    (paramsSyncStateText: ParamSyncStateText) => {
      expect(paramsSyncStateText.expectedReturnValue).toBe(
        syncStateText(
          paramsSyncStateText.isSyncing,
          paramsSyncStateText.isAbort,
        ),
      );
    },
  );
});
