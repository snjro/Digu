import { beforeEach, describe, expect, test, vi } from "vitest";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import { saveRpcConfigValue } from "./rpcConfigSave";

vi.mock("@db/dbSettings", () => ({ updateDbItemRpcSettings: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveRpcConfigValue", () => {
  test.each([
    ["bulkUnit", 1000],
    ["tryCount", 3],
    ["blockIntervalMs", 12000],
  ] as const)("should save %j as %j", async (name, value) => {
    await saveRpcConfigValue("eth", name, value);
    expect(updateDbItemRpcSettings).toHaveBeenCalledTimes(1);
    expect(updateDbItemRpcSettings).toHaveBeenCalledWith("eth", name, value);
  });
});
