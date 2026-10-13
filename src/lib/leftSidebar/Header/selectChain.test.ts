import { afterEach, describe, expect, test, vi } from "vitest";
import { updateDbItemUserSettings } from "#db/dbSettings.js";
import { saveSelectedChainName } from "./selectChain";

vi.mock("#db/dbSettings.js", () => ({ updateDbItemUserSettings: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("saveSelectedChainName", () => {
  test("writes the chain name to the user settings", async () => {
    await saveSelectedChainName("chain2");
    expect(updateDbItemUserSettings).toHaveBeenCalledTimes(1);
    expect(updateDbItemUserSettings).toHaveBeenCalledWith(
      "selectedChainName",
      "chain2",
    );
  });
});
