// Minimal in-memory Web Locks API for tests. happy-dom has no navigator.locks.
// Exclusive and shared locks, granted in request order: a waiting exclusive
// request also holds back the shared requests after it. Supports ifAvailable
// and signal.
type Waiter = { mode: LockMode; grant: () => void };

export class FakeLockManager {
  private held: Map<string, LockMode[]> = new Map();
  private queues: Map<string, Waiter[]> = new Map();

  async request<T>(
    name: string,
    optionsOrCallback: LockOptions | ((lock: Lock | null) => T),
    maybeCallback?: (lock: Lock | null) => T,
  ): Promise<Awaited<T>> {
    const options: LockOptions =
      typeof optionsOrCallback === "function" ? {} : optionsOrCallback;
    const callback =
      typeof optionsOrCallback === "function"
        ? optionsOrCallback
        : maybeCallback!;
    const mode: LockMode = options.mode ?? "exclusive";

    options.signal?.throwIfAborted();
    if (this.isGrantable(name, mode)) {
      this.hold(name, mode);
    } else {
      if (options.ifAvailable) return await callback(null);
      await this.waitForGrant(name, mode, options.signal);
    }
    try {
      return await callback({ name, mode } as Lock);
    } finally {
      this.release(name, mode);
    }
  }

  async query(): Promise<LockManagerSnapshot> {
    return {
      held: [...this.held].flatMap(([name, modes]) =>
        modes.map((mode) => ({ name, mode })),
      ),
      pending: [...this.queues].flatMap(([name, queue]) =>
        queue.map(({ mode }) => ({ name, mode })),
      ),
    };
  }

  // No waiting request first, and no held lock that conflicts.
  private isGrantable(name: string, mode: LockMode): boolean {
    if ((this.queues.get(name) ?? []).length > 0) return false;
    return this.isFree(name, mode);
  }

  private isFree(name: string, mode: LockMode): boolean {
    const modes: LockMode[] = this.held.get(name) ?? [];
    if (modes.length === 0) return true;
    return mode === "shared" && modes.every((held) => held === "shared");
  }

  private hold(name: string, mode: LockMode): void {
    this.held.set(name, [...(this.held.get(name) ?? []), mode]);
  }

  // Resolves when the lock is granted. Rejects with the abort reason if the
  // signal aborts first.
  private waitForGrant(
    name: string,
    mode: LockMode,
    signal?: AbortSignal,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = {
        mode,
        grant: () => {
          signal?.removeEventListener("abort", abort);
          resolve();
        },
      };
      const abort = (): void => {
        const queue = this.queues.get(name) ?? [];
        this.queues.set(
          name,
          queue.filter((queued) => queued !== waiter),
        );
        this.grantWaiters(name);
        reject(signal!.reason);
      };
      signal?.addEventListener("abort", abort, { once: true });
      this.queues.set(name, [...(this.queues.get(name) ?? []), waiter]);
    });
  }

  private release(name: string, mode: LockMode): void {
    const modes: LockMode[] = [...(this.held.get(name) ?? [])];
    modes.splice(modes.indexOf(mode), 1);
    if (modes.length > 0) {
      this.held.set(name, modes);
    } else {
      this.held.delete(name);
    }
    this.grantWaiters(name);
  }

  // Grants the waiting requests in order, while they do not conflict.
  private grantWaiters(name: string): void {
    const queue: Waiter[] = this.queues.get(name) ?? [];
    while (queue.length > 0 && this.isFree(name, queue[0].mode)) {
      const waiter: Waiter = queue.shift()!;
      this.hold(name, waiter.mode);
      waiter.grant();
    }
    if (queue.length === 0) this.queues.delete(name);
  }
}

// Like an insecure context, where navigator.locks is undefined.
export function removeLockManager(): void {
  Object.defineProperty(navigator, "locks", {
    value: undefined,
    configurable: true,
  });
}

export function installFakeLockManager(): FakeLockManager {
  const lockManager = new FakeLockManager();
  Object.defineProperty(navigator, "locks", {
    value: lockManager,
    configurable: true,
  });
  return lockManager;
}
