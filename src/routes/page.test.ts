import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";
import { load } from "./+page";
import { isHttpError, isRedirect, redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import * as dbSettingsDataHandlersUser from "@db/dbSettings";

let mockBrowser: boolean; //Variable for changing the value of "browser" in each test

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
  const expectedSelectedChainName: string = "testChainName";
  const spyGetDbItemUserSettings = vi
    .spyOn(dbSettingsDataHandlersUser, "getDbItemUserSettings")
    .mockResolvedValue(expectedSelectedChainName);

  const spyRedirect = vi.mocked(redirect);
  beforeEach(() => {
    // clear call count
    spyGetDbItemUserSettings.mockClear();
    spyRedirect.mockClear();
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("redirects to the selected chain in the browser", async () => {
    mockBrowser = true;
    // "redirect" throws, so "load" rejects with the thrown value.
    const thrown: unknown = await load().catch((error: unknown) => error);

    expect(spyGetDbItemUserSettings).toHaveBeenCalledWith(
      "userSetting01",
      "selectedChainName",
    );
    expect(spyGetDbItemUserSettings).toHaveResolvedWith(
      expectedSelectedChainName,
    );
    expect(spyRedirect).toHaveBeenCalledOnce();
    expect(spyRedirect).toHaveBeenCalledWith(
      308,
      `${base}/${expectedSelectedChainName}`,
    );
    expect(spyRedirect.mock.results[0]).toEqual({
      type: "throw",
      value: thrown,
    });
    expect(isRedirect(thrown)).toBe(true);
    expect(thrown).toMatchObject({
      status: 308,
      location: `${base}/${expectedSelectedChainName}`,
    });
  });

  test("throws 404 when no chain name is saved", async () => {
    mockBrowser = true;
    spyGetDbItemUserSettings.mockResolvedValueOnce(undefined);
    const thrown: unknown = await load().catch((error: unknown) => error);

    expect(isHttpError(thrown, 404)).toBe(true);
    expect(isHttpError(thrown) && thrown.body.message).toBe(
      "could not get a chain name",
    );
    expect(spyRedirect).not.toBeCalled();
  });

  test("does nothing outside the browser", async () => {
    mockBrowser = false;
    await expect(load()).resolves.toBeUndefined();

    expect(spyGetDbItemUserSettings).not.toBeCalled();
    expect(spyRedirect).not.toBeCalled();
  });
});
