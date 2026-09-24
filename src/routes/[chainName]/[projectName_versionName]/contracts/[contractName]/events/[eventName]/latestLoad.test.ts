import { describe, expect, test, vi } from "vitest";
import { applyLatestLoad } from "./latestLoad";

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("applyLatestLoad", () => {
  test("should apply the result of the load", async () => {
    const apply = vi.fn();
    applyLatestLoad(Promise.resolve("a"), apply);
    await Promise.resolve();
    expect(apply).toHaveBeenCalledWith("a");
  });
  test("should not apply the result after the cleanup", async () => {
    const apply = vi.fn();
    const load = deferred<string>();
    const cleanup = applyLatestLoad(load.promise, apply);
    cleanup();
    load.resolve("a");
    await load.promise;
    expect(apply).not.toHaveBeenCalled();
  });
  test("should keep the later result when the earlier load ends last", async () => {
    let value: string | undefined = undefined;
    const apply = (v: string) => {
      value = v;
    };
    const earlier = deferred<string>();
    const later = deferred<string>();
    const cleanupEarlier = applyLatestLoad(earlier.promise, apply);
    cleanupEarlier();
    applyLatestLoad(later.promise, apply);
    later.resolve("later");
    await later.promise;
    earlier.resolve("earlier");
    await earlier.promise;
    expect(value).toBe("later");
  });
});
