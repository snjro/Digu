import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";
import { load } from "./+page";
import { isRedirect, redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import * as dbSettingsDataHandlersUser from "@db/dbSettings";

type BrowserValue = { browserValue: boolean };
const browserValues: BrowserValue[] = [
  { browserValue: true },
  { browserValue: false },
];

let mockBrowser: boolean; //Variable for dynamically changing the value of "browser" in a loop

// create mocks
vi.mock("$app/environment", () => {
  return {
    get browser() {
      return mockBrowser;
    },
  };
});
vi.mock("$app/navigation");
// ESM exports of "@sveltejs/kit" cannot be spied on directly
vi.mock("@sveltejs/kit", async (importOriginal) => {
  const original = await importOriginal<typeof import("@sveltejs/kit")>();
  return { ...original, redirect: vi.fn(original.redirect) };
});

describe("load", () => {
  const expectedSlelectedChainName: string = "testChainName";
  const spyGetDbItemUserSettings = vi
    .spyOn(dbSettingsDataHandlersUser, "getDbItemUserSettings")
    .mockResolvedValue(expectedSlelectedChainName);

  const spyRedirect = vi.mocked(redirect);
  beforeEach(() => {
    // clear call count
    spyGetDbItemUserSettings.mockClear();
    spyRedirect.mockClear();
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  test.each(browserValues)(`should $browserValue`, async ({ browserValue }) => {
    mockBrowser = browserValue;

    if (browserValue) {
      // "redirect" throws, so "load" rejects with the thrown value.
      const thrown: unknown = await load().catch((error: unknown) => error);

      expect(spyGetDbItemUserSettings).toHaveBeenCalledWith(
        "userSetting01",
        "selectedChainName",
      );
      expect(spyGetDbItemUserSettings).toHaveResolvedWith(
        expectedSlelectedChainName,
      );
      expect(spyRedirect).toHaveBeenCalledOnce();
      expect(spyRedirect).toHaveBeenCalledWith(
        308,
        `${base}/${expectedSlelectedChainName}`,
      );
      expect(spyRedirect.mock.results[0]).toEqual({
        type: "throw",
        value: thrown,
      });
      expect(isRedirect(thrown)).toBe(true);
      expect(thrown).toMatchObject({
        status: 308,
        location: `${base}/${expectedSlelectedChainName}`,
      });
    } else {
      await expect(load()).resolves.toBeUndefined();

      expect(spyGetDbItemUserSettings).not.toBeCalled();
      expect(spyRedirect).not.toBeCalled();
    }
  });
});
