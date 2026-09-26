import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import VersionOverviewContracts from "./VersionOverviewContracts.svelte";
import type {
  Chain,
  Contract,
  Project,
  Version,
} from "@constants/chains/types";

vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/chain1/project1-version1/") },
}));
vi.mock("@routes/+layout", () => ({ trailingSlash: "always" }));
// The real store builds its state from the chain data, which loads ethers.
// ethers does not load in the client project, so the store is a plain one.
// contract2 has no event to sync, so it has no sync status.
vi.mock("@stores/storeSyncStatus", async () => {
  const { writable } = await import("svelte/store");
  return {
    storeSyncStatus: writable({
      chain1: {
        isSyncing: false,
        subSyncStatuses: {
          project1: {
            subSyncStatuses: {
              version1: {
                subSyncStatuses: {
                  contract1: {
                    isSyncTarget: true,
                    syncStateText: "stopped",
                    subSyncStatuses: null,
                  },
                },
              },
            },
          },
        },
      },
    }),
  };
});
// utilsEthers loads ethers. The same rule as the real hasSyncTargetEvents.
vi.mock("@utils/utilsEthers", () => ({
  hasSyncTargetEvents: (contract: Contract): boolean =>
    contract.events.names.length > 0,
}));
vi.mock("$lib/common/toggleSyncTarget", () => ({
  toggleIsSyncTarget: vi.fn(),
}));

const chain = { name: "chain1" } as Chain;
const project = { name: "project1" } as Project;
const version = {
  name: "version1",
  contracts: [
    { name: "contract1", events: { abiFragments: [{}], names: ["E"] } },
    // Only anonymous events.
    { name: "contract2", events: { abiFragments: [{}], names: [] } },
  ],
} as unknown as Version;

describe("VersionOverviewContracts.svelte", () => {
  test("shows - in the sync columns of a contract with no event to sync", () => {
    render(VersionOverviewContracts, {
      targetChain: chain,
      targetProject: project,
      targetVersion: version,
    });
    expect(screen.getByText("contract2")).toBeTruthy();
    // Sync Target and Sync State of contract2.
    expect(screen.getAllByText("-")).toHaveLength(2);
    expect(screen.getByText("stopped")).toBeTruthy();
  });
});
