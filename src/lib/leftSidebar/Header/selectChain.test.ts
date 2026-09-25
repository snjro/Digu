import { afterEach, describe, expect, test, vi } from "vitest";
import { updateDbItemUserSettings } from "@db/dbSettings";
import { saveSelectedChainName } from "./selectChain";

vi.mock("@db/dbSettings", () => ({ updateDbItemUserSettings: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("saveSelectedChainName", () => {
  test("writes the chain name to the user settings", async () => {
    await saveSelectedChainName("matic");
    expect(updateDbItemUserSettings).toHaveBeenCalledTimes(1);
    expect(updateDbItemUserSettings).toHaveBeenCalledWith(
      "selectedChainName",
      "matic",
    );
  });
});
