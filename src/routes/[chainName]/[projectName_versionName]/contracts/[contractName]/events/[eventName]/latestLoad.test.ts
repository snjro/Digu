import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { customLogger } from "@utils/logger";
import { applyLatestLoad, createThrottledLoad } from "./latestLoad";

vi.mock("@utils/logger", () => ({
  customLogger: {
    error: vi.fn(),
  },
}));

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

describe("createThrottledLoad", () => {
  const interval: number = 3000;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("should load at once on the first request", async () => {
    const load = vi.fn().mockResolvedValue("a");
    const apply = vi.fn();
    createThrottledLoad(load, apply, interval).request();
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(apply).toHaveBeenCalledWith("a");
  });

  test("should load once or twice for many requests in a short time, and once after the last request", async () => {
    const loadStartedAt: number[] = [];
    const load = vi.fn(() => {
      loadStartedAt.push(Date.now());
      return Promise.resolve("a");
    });
    const throttledLoad = createThrottledLoad(load, vi.fn(), interval);
    throttledLoad.request();
    await vi.advanceTimersByTimeAsync(0);
    let lastRequestedAt: number = 0;
    for (let index = 0; index < 5; index++) {
      await vi.advanceTimersByTimeAsync(200);
      throttledLoad.request();
      lastRequestedAt = Date.now();
    }
    expect(load).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(interval * 3);
    expect(load).toHaveBeenCalledTimes(2);
    expect(loadStartedAt[1]).toBeGreaterThanOrEqual(lastRequestedAt);
  });

  test("should not stop or overlap the running load on a request", async () => {
    const first = deferred<string>();
    const signals: AbortSignal[] = [];
    const load = vi.fn((signal: AbortSignal) => {
      signals.push(signal);
      return signals.length === 1 ? first.promise : Promise.resolve("b");
    });
    const apply = vi.fn();
    const throttledLoad = createThrottledLoad(load, apply, interval);
    throttledLoad.request();
    throttledLoad.request();
    await vi.advanceTimersByTimeAsync(interval * 2);
    expect(load).toHaveBeenCalledTimes(1);
    expect(signals[0].aborted).toBe(false);

    first.resolve("a");
    await vi.advanceTimersByTimeAsync(0);
    expect(apply).toHaveBeenLastCalledWith("a");
    // The next load waits for the interval after the previous one ended.
    await vi.advanceTimersByTimeAsync(interval - 1);
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(0);
    expect(apply).toHaveBeenLastCalledWith("b");
  });

  test("should stop the running load on dispose", async () => {
    const running = deferred<string>();
    const signals: AbortSignal[] = [];
    const apply = vi.fn();
    const throttledLoad = createThrottledLoad(
      (signal: AbortSignal) => {
        signals.push(signal);
        return running.promise;
      },
      apply,
      interval,
    );
    throttledLoad.request();
    throttledLoad.dispose();
    expect(signals[0].aborted).toBe(true);
    running.resolve("a");
    await vi.advanceTimersByTimeAsync(0);
    expect(apply).not.toHaveBeenCalled();
  });

  test("should load on a later request after the load failed", async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("test error"))
      .mockResolvedValue("a");
    const apply = vi.fn();
    const throttledLoad = createThrottledLoad(load, apply, interval);
    throttledLoad.request();
    await vi.advanceTimersByTimeAsync(0);
    expect(apply).not.toHaveBeenCalled();
    expect(customLogger.error).toHaveBeenCalledTimes(1);

    throttledLoad.request();
    await vi.advanceTimersByTimeAsync(interval);
    expect(load).toHaveBeenCalledTimes(2);
    expect(apply).toHaveBeenCalledWith("a");
  });

  test("should load for the waiting request after apply threw", async () => {
    const first = deferred<string>();
    const load = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue("b");
    const apply = vi.fn().mockImplementationOnce(() => {
      throw new Error("test error");
    });
    const throttledLoad = createThrottledLoad(load, apply, interval);
    throttledLoad.request();
    throttledLoad.request();
    first.resolve("a");
    await vi.advanceTimersByTimeAsync(interval);
    expect(customLogger.error).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(2);
    expect(apply).toHaveBeenLastCalledWith("b");
  });

  test("should not log an error of a stopped load", async () => {
    const throttledLoad = createThrottledLoad(
      (signal: AbortSignal) =>
        new Promise<string>((_, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason));
        }),
      vi.fn(),
      interval,
    );
    throttledLoad.request();
    throttledLoad.dispose();
    await vi.advanceTimersByTimeAsync(0);
    expect(customLogger.error).not.toHaveBeenCalled();
  });

  test("should not load after dispose", async () => {
    const load = vi.fn().mockResolvedValue("a");
    const throttledLoad = createThrottledLoad(load, vi.fn(), interval);
    throttledLoad.request();
    await vi.advanceTimersByTimeAsync(0);
    throttledLoad.request();
    throttledLoad.dispose();
    throttledLoad.request();
    await vi.advanceTimersByTimeAsync(interval * 2);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
