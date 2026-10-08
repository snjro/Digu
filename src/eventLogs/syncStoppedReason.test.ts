import { afterEach, describe, expect, test } from "vitest";
import { get } from "svelte/store";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { ChainName } from "#constants/chains/types.js";
import type { SyncStatusesChain } from "#db/dbTypes.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { recordSyncStoppedReason } from "./syncStoppedReason";

const chainName: ChainName = TARGET_CHAINS[0].name;

function setChainAborting(isAbort: boolean): void {
  storeSyncStatus.update((state: SyncStatusesChain) => {
    state[chainName].isAbort = isAbort;
    return state;
  });
}

describe("recordSyncStoppedReason", () => {
  afterEach(() => {
    setChainAborting(false);
    storeSyncStoppedReason.clear(chainName);
  });

  test("should record the reason when the chain is not stopping", () => {
    recordSyncStoppedReason(chainName, "RPC_ERRORS");
    expect(get(storeSyncStoppedReason)[chainName]).toBe("RPC_ERRORS");
  });

  test("should keep no reason when the chain is already stopping", () => {
    setChainAborting(true);
    recordSyncStoppedReason(chainName, "RPC_ERRORS");
    expect(get(storeSyncStoppedReason)[chainName]).toBeUndefined();
  });
});
