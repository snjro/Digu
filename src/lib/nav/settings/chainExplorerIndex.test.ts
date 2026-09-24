import { beforeEach, describe, expect, test, vi } from "vitest";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import { updateChainExplorerIndex } from "./chainExplorerIndex";

vi.mock("@db/dbSettings", () => ({ updateDbItemRpcSettings: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateChainExplorerIndex", () => {
  test.each([
    ["0", 0],
    ["1", 1],
    ["10", 10],
  ])("should save the selected value %j as %j", async (value, index) => {
    await updateChainExplorerIndex("eth", value);
    expect(updateDbItemRpcSettings).toHaveBeenCalledTimes(1);
    expect(updateDbItemRpcSettings).toHaveBeenCalledWith(
      "eth",
      "chainExplorerIndex",
      index,
    );
  });
});
