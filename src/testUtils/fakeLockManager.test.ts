import { describe, expect, test } from "vitest";
import { FakeLockManager } from "./fakeLockManager";

// Holds the lock until the returned function is called. `granted` resolves
// once the lock is granted.
function hold(
  manager: FakeLockManager,
  name: string,
  options: LockOptions = {},
): { granted: Promise<void>; release: () => void; done: Promise<void> } {
  let release: () => void = () => {};
  let grant: () => void = () => {};
  const granted = new Promise<void>((resolve) => (grant = resolve));
  const done = manager.request(name, options, async () => {
    grant();
    await new Promise<void>((resolve) => (release = resolve));
  });
  return { granted, release: () => release(), done };
}

describe("FakeLockManager", () => {
  test("grants shared locks together, and an exclusive one after them", async () => {
    const manager = new FakeLockManager();
    const first = hold(manager, "x", { mode: "shared" });
    const second = hold(manager, "x", { mode: "shared" });
    await Promise.all([first.granted, second.granted]);
    const exclusive = hold(manager, "x");
    expect((await manager.query()).held).toEqual([
      { name: "x", mode: "shared" },
      { name: "x", mode: "shared" },
    ]);
    expect((await manager.query()).pending).toEqual([
      { name: "x", mode: "exclusive" },
    ]);
    first.release();
    await first.done;
    second.release();
    await second.done;
    await exclusive.granted;
    expect((await manager.query()).held).toEqual([
      { name: "x", mode: "exclusive" },
    ]);
    exclusive.release();
    await exclusive.done;
    expect(await manager.query()).toEqual({ held: [], pending: [] });
  });

  test("holds back a shared request behind a waiting exclusive one", async () => {
    const manager = new FakeLockManager();
    const first = hold(manager, "x", { mode: "shared" });
    await first.granted;
    const exclusive = hold(manager, "x");
    const later = hold(manager, "x", { mode: "shared" });
    let laterGranted: boolean = false;
    void later.granted.then(() => (laterGranted = true));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(laterGranted).toBe(false);
    first.release();
    await exclusive.granted;
    expect(laterGranted).toBe(false);
    exclusive.release();
    await later.granted;
    later.release();
    await later.done;
  });

  test("ifAvailable gives null for a conflicting lock or a waiting request", async () => {
    const manager = new FakeLockManager();
    const shared = hold(manager, "x", { mode: "shared" });
    await shared.granted;
    expect(
      await manager.request(
        "x",
        { mode: "shared", ifAvailable: true },
        (lock) => lock?.mode,
      ),
    ).toBe("shared");
    expect(
      await manager.request("x", { ifAvailable: true }, (lock) => lock),
    ).toBeNull();
    const exclusive = hold(manager, "x");
    expect(
      await manager.request(
        "x",
        { mode: "shared", ifAvailable: true },
        (lock) => lock,
      ),
    ).toBeNull();
    shared.release();
    await exclusive.granted;
    exclusive.release();
    await exclusive.done;
  });

  test("gives the next request its turn when a waiting one is aborted", async () => {
    const manager = new FakeLockManager();
    const shared = hold(manager, "x", { mode: "shared" });
    await shared.granted;
    const controller = new AbortController();
    const aborted = manager.request(
      "x",
      { signal: controller.signal },
      () => {},
    );
    const later = hold(manager, "x", { mode: "shared" });
    controller.abort(new Error("aborted"));
    await expect(aborted).rejects.toThrow("aborted");
    await later.granted;
    shared.release();
    later.release();
    await Promise.all([shared.done, later.done]);
    expect(await manager.query()).toEqual({ held: [], pending: [] });
  });
});
