import type { ChainName } from "@constants/chains/types";
import { DbSettingsDataHandlers } from "@db/dbSettings";
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type MockedFunction,
} from "vitest";
import { load } from "./+page";
import * as appNav from "$app/navigation";
import { goto } from "$app/navigation";

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
  const expectedSlelectedChainName: ChainName = "testChainName";
  const spyGetDbItemUserSettings = vi
    .spyOn(DbSettingsDataHandlers, "getDbItemUserSettings")
    .mockResolvedValue(expectedSlelectedChainName);

  test.each(browserValues)(`should $browserValue`, async ({ browserValue }) => {
    mockBrowser = browserValue;
    beforeEach(() => {
      // clear call count
      spyGetDbItemUserSettings.mockClear();

      // To get a mocked function, cast "goto" as MockedFunction.
      // https://stackoverflow.com/questions/52457575/jest-typescript-property-mock-does-not-exist-on-type
      (appNav.goto as MockedFunction<typeof appNav.goto>).mockClear();
    });
    afterAll(() => {
      vi.restoreAllMocks();
    });
    await load();
    if (browserValue) {
      expect(spyGetDbItemUserSettings).toHaveBeenCalledWith(
        "userSetting01",
        "selectedChainName",
      );
      expect(spyGetDbItemUserSettings).toHaveReturnedWith(
        expectedSlelectedChainName,
      );
      expect(goto).toHaveBeenCalledWith(`/${expectedSlelectedChainName}`);
    } else {
      expect(spyGetDbItemUserSettings).not.toBeCalled();
      expect(goto).not.toHaveBeenCalled();
    }
  });
});
