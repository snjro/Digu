import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import ChainOverviewVersions from "./ChainOverviewVersions.svelte";
import type { Chain, Project, Version } from "@constants/chains/types";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeChainStatus } from "@stores/storeChainStatus";

vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/chain1/") },
}));
vi.mock("@routes/+layout", () => ({ trailingSlash: "always" }));
// The real stores build their state from the chain data, which loads ethers.
// ethers does not load in the client project, so the stores are plain ones.
vi.mock("@stores/storeSyncStatus", async () => {
  const { writable } = await import("svelte/store");
  return {
    storeSyncStatus: writable({
      chain1: { subSyncStatuses: { project1: { subSyncStatuses: {} } } },
    }),
  };
});
vi.mock("@stores/storeChainStatus", async () => {
  const { writable } = await import("svelte/store");
  return { storeChainStatus: writable({}) };
});
vi.mock("@stores/storeRpcSettings", async () => {
  const { writable } = await import("svelte/store");
  return { storeRpcSettings: writable({}) };
});
vi.mock("@utils/utilsDb", () => ({ getTargetChain: vi.fn() }));
vi.mock("$lib/common/toggleSyncTarget", () => ({
  toggleIsSyncTarget: vi.fn(),
}));

const chain = { name: "chain1" } as Chain;
// A version without events, so that the row shows no sync components.
const version = {
  name: "version1",
  contracts: [{ events: { abiFragments: [] } }],
} as unknown as Version;
const project = { name: "project1", versions: [version] } as unknown as Project;

describe("ChainOverviewVersions.svelte", () => {
  test("names the last column after the number it shows, the events", () => {
    render(ChainOverviewVersions, {
      targetChain: chain,
      targetProject: project,
    });
    expect(screen.getByText("Events")).toBeTruthy();
    expect(screen.queryByText("Contracts")).toBeNull();
  });

  test("shows the progress of a version with two sync target contracts", () => {
    // The version values are the sums of the two contracts, so the goal is
    // the latest block number times two: (300 - 200) / (600 - 200) = 25%.
    const versionWithEvents = {
      name: "version2",
      contracts: [
        { name: "contract1", events: { abiFragments: [{}] } },
        { name: "contract2", events: { abiFragments: [{}] } },
      ],
    } as unknown as Version;
    storeSyncStatus.set({
      chain1: {
        subSyncStatuses: {
          project1: {
            subSyncStatuses: {
              version2: {
                isSyncTarget: true,
                isSyncing: false,
                syncStateText: "stopped",
                creationBlockNumber: 200,
                fetchedBlockNumber: 300,
                numOfSyncTargetContract: 2,
              },
            },
          },
        },
      },
    } as never);
    storeChainStatus.set({ chain1: { latestBlockNumber: 300 } } as never);
    render(ChainOverviewVersions, {
      targetChain: chain,
      targetProject: {
        name: "project1",
        versions: [versionWithEvents],
      } as unknown as Project,
    });
    expect(screen.getByText("25.0%")).toBeTruthy();
  });
});
