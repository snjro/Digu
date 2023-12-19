import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";
import { load } from "./+page";
import * as kit from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
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

describe("load", () => {
  const expectedSlelectedChainName: string = "testChainName";
  const spyGetDbItemUserSettings = vi
    .spyOn(dbSettingsDataHandlersUser, "getDbItemUserSettings")
    .mockResolvedValue(expectedSlelectedChainName);

  const spyRedirect = vi.spyOn(kit, "redirect");

  test.each(browserValues)(`should $browserValue`, async ({ browserValue }) => {
    mockBrowser = browserValue;
    beforeEach(() => {
      // clear call count
      spyGetDbItemUserSettings.mockClear();
    });
    afterAll(() => {
      vi.restoreAllMocks();
    });

    // "redirect" throws, so need to catch.
    try {
      await load();
    } catch (error) {}

    if (browserValue) {
      expect(spyGetDbItemUserSettings).toHaveBeenCalledWith(
        "userSetting01",
        "selectedChainName",
      );

      expect(spyGetDbItemUserSettings).toHaveReturnedWith(
        expectedSlelectedChainName,
      );
      expect(spyRedirect).toThrow();
    } else {
      expect(spyGetDbItemUserSettings).not.toBeCalled();
      expect(redirect).toThrowError();
    }
  });
});
