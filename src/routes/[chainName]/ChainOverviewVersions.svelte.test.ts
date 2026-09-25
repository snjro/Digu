import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import ChainOverviewVersions from "./ChainOverviewVersions.svelte";
import type { Chain, Project, Version } from "@constants/chains/types";

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
});
