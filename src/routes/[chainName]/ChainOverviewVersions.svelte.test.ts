import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import ChainOverviewVersions from "./ChainOverviewVersions.svelte";
import type {
  Chain,
  Contract,
  Project,
  Version,
} from "@constants/chains/types";
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
// utilsEthers loads ethers. The same rule as the real hasSyncTargetEvents.
vi.mock("@utils/utilsEthers", () => ({
  hasSyncTargetEvents: (contract: Contract): boolean =>
    contract.events.names.length > 0,
}));
vi.mock("$lib/common/toggleSyncTarget", () => ({
  toggleIsSyncTarget: vi.fn(),
}));

const chain = { name: "chain1" } as Chain;
// A version without events, so that the row shows no sync components.
const version = {
  name: "version1",
  contracts: [{ events: { abiFragments: [], names: [] } }],
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
        { name: "contract1", events: { abiFragments: [{}], names: ["E"] } },
        { name: "contract2", events: { abiFragments: [{}], names: ["E"] } },
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

  test("shows no sync components for a version with only anonymous events", () => {
    // Anonymous events are not synced, but the Events column counts them.
    const versionWithAnonymousEvents = {
      name: "version3",
      contracts: [
        { name: "contract1", events: { abiFragments: [{}], names: [] } },
      ],
    } as unknown as Version;
    storeSyncStatus.set({
      chain1: {
        subSyncStatuses: {
          project1: {
            subSyncStatuses: {
              version3: {
                isSyncTarget: false,
                isSyncing: false,
                syncStateText: "stopped",
                creationBlockNumber: 0,
                fetchedBlockNumber: 0,
                numOfSyncTargetContract: 0,
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
        versions: [versionWithAnonymousEvents],
      } as unknown as Project,
    });
    // Sync Target, Sync State and Progress.
    expect(screen.getAllByText("-")).toHaveLength(3);
    expect(screen.queryByText("stopped")).toBeNull();
    expect(screen.getByRole("link", { name: "1" }).getAttribute("href")).toBe(
      "/chain1/project1-version3/contracts",
    );
  });
});
