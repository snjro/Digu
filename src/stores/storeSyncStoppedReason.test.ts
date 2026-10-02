import { beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { ChainName } from "#constants/chains/types.js";

const chainName: ChainName = TARGET_CHAINS[0].name;

// Import a fresh store for each test, so that no test depends on the state
// left by another test.
async function importStoreSyncStoppedReason() {
  return (await import("./storeSyncStoppedReason")).storeSyncStoppedReason;
}

describe("storeSyncStoppedReason", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("should have no reason for each chain at first", async () => {
    const storeSyncStoppedReason = await importStoreSyncStoppedReason();
    for (const chain of TARGET_CHAINS) {
      expect(get(storeSyncStoppedReason)[chain.name]).toBeUndefined();
    }
  });

  test("should record the reason of the chain only", async () => {
    const storeSyncStoppedReason = await importStoreSyncStoppedReason();
    storeSyncStoppedReason.record(chainName, "RPC_ERRORS");
    const state = get(storeSyncStoppedReason);
    expect(state[chainName]).toBe("RPC_ERRORS");
    for (const chain of TARGET_CHAINS.slice(1)) {
      expect(state[chain.name]).toBeUndefined();
    }
  });

  test("should keep the first reason", async () => {
    const storeSyncStoppedReason = await importStoreSyncStoppedReason();
    storeSyncStoppedReason.record(chainName, "RPC_ERRORS");
    storeSyncStoppedReason.record(chainName, "UNEXPECTED_ERROR");
    expect(get(storeSyncStoppedReason)[chainName]).toBe("RPC_ERRORS");
  });

  test("should clear the reason", async () => {
    const storeSyncStoppedReason = await importStoreSyncStoppedReason();
    storeSyncStoppedReason.record(chainName, "UNEXPECTED_ERROR");
    storeSyncStoppedReason.clear(chainName);
    expect(get(storeSyncStoppedReason)[chainName]).toBeUndefined();
  });
});
