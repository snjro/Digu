import { afterEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { isHttpError } from "@sveltejs/kit";
import { load } from "./+layout";
import { initialize } from "../initialization/initialize";
import { storeNodbShowLoader } from "@stores/storeNoDb";

// storeNoDb reads "browser" when it is imported, before the tests run.
const mockEnvironment = vi.hoisted(() => ({ browser: false }));

vi.mock("$app/environment", () => mockEnvironment);
vi.mock("../initialization/initialize", () => ({ initialize: vi.fn() }));

describe("load", () => {
  afterEach(() => {
    vi.mocked(initialize).mockReset();
    storeNodbShowLoader.set(false);
  });

  test("does not initialize outside the browser", async () => {
    mockEnvironment.browser = false;

    await expect(load()).resolves.toBeUndefined();

    expect(initialize).not.toHaveBeenCalled();
  });

  test("shows the loader while initializing, then hides it", async () => {
    mockEnvironment.browser = true;
    const loaderValues: boolean[] = [];
    vi.mocked(initialize).mockImplementation(async () => {
      loaderValues.push(get(storeNodbShowLoader));
    });

    await expect(load()).resolves.toBeUndefined();

    expect(initialize).toHaveBeenCalledOnce();
    expect(loaderValues).toEqual([true]);
    expect(get(storeNodbShowLoader)).toBe(false);
  });

  test("throws a 500 error with the cause when initializing fails", async () => {
    mockEnvironment.browser = true;
    vi.mocked(initialize).mockRejectedValue(
      new Error("DbWorker: initializeDbSettings: test failure"),
    );

    const thrown: unknown = await load().catch((error: unknown) => error);

    expect(isHttpError(thrown, 500)).toBe(true);
    expect(thrown).toMatchObject({
      body: {
        message: expect.stringContaining(
          "DbWorker: initializeDbSettings: test failure",
        ),
      },
    });
    expect(thrown).toMatchObject({
      body: { message: expect.stringContaining("IndexedDB") },
    });
    expect(get(storeNodbShowLoader)).toBe(false);
  });
});
