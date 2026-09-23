// Minimal in-memory Web Locks API for tests. happy-dom has no navigator.locks.
// Exclusive locks only, granted in request order. Supports ifAvailable and
// signal.
export class FakeLockManager {
  private held: Set<string> = new Set();
  private queues: Map<string, (() => void)[]> = new Map();

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

    options.signal?.throwIfAborted();
    if (this.held.has(name)) {
      if (options.ifAvailable) return await callback(null);
      await this.waitForRelease(name, options.signal);
    } else {
      this.held.add(name);
    }
    try {
      return await callback({ name, mode: "exclusive" } as Lock);
    } finally {
      this.release(name);
    }
  }

  async query(): Promise<LockManagerSnapshot> {
    return {
      held: [...this.held].map((name) => ({ name, mode: "exclusive" })),
      pending: [...this.queues].flatMap(([name, queue]) =>
        queue.map(() => ({ name, mode: "exclusive" as LockMode })),
      ),
    };
  }

  // Resolves when release() hands the lock over. Rejects with the abort
  // reason if the signal aborts first.
  private waitForRelease(name: string, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const grant = (): void => {
        signal?.removeEventListener("abort", abort);
        resolve();
      };
      const abort = (): void => {
        const queue = this.queues.get(name) ?? [];
        this.queues.set(
          name,
          queue.filter((waiter) => waiter !== grant),
        );
        reject(signal!.reason);
      };
      signal?.addEventListener("abort", abort, { once: true });
      this.queues.set(name, [...(this.queues.get(name) ?? []), grant]);
    });
  }

  private release(name: string): void {
    const next: (() => void) | undefined = this.queues.get(name)?.shift();
    if (next) {
      next();
    } else {
      this.held.delete(name);
    }
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
