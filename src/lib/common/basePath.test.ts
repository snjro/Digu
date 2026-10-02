import { afterEach, describe, expect, test, vi } from "vitest";

// basePath is computed when the module is imported, so each case imports it again.
afterEach(() => {
  vi.doUnmock("$app/paths");
  vi.resetModules();
});

describe("basePath", () => {
  test.each([
    ["/Digu/", "/Digu"],
    ["/", ""],
  ])('resolve("/") %j gives %j', async (resolved, expected) => {
    const resolve = vi.fn(() => resolved);
    vi.doMock("$app/paths", () => ({ resolve }));
    const { basePath } = await import("./basePath");
    expect(basePath).toBe(expected);
    expect(resolve).toHaveBeenCalledWith("/");
  });
});
