// Applies the result only while it is the latest load, so a slow earlier load
// does not overwrite a later one. Returns the cleanup for $effect.
export function applyLatestLoad<T>(
  load: Promise<T>,
  apply: (value: T) => void,
): () => void {
  let isStale: boolean = false;
  load.then((value: T) => {
    if (!isStale) apply(value);
  });
  return () => {
    isStale = true;
  };
}

// Loads at once on the first request. Later requests wait until intervalMs has
// passed since the previous load ended, so many requests in a short time make
// one load, which still starts after the last request. A request does not stop
// the running load; dispose() does, and the result is not applied.
export function createThrottledLoad<T>(
  load: (signal: AbortSignal) => Promise<T>,
  apply: (value: T) => void,
  intervalMs: number,
): { request: () => void; dispose: () => void } {
  let lastEndedAt: number = -Infinity;
  let isRequested: boolean = false;
  let isDisposed: boolean = false;
  let timer: ReturnType<typeof setTimeout> | undefined = undefined;
  let running: AbortController | undefined = undefined;

  function start(): void {
    isRequested = false;
    const controller: AbortController = new AbortController();
    running = controller;
    void load(controller.signal).then((value: T) => {
      if (controller.signal.aborted) return;
      running = undefined;
      lastEndedAt = Date.now();
      apply(value);
      schedule();
    });
  }
  function schedule(): void {
    if (isDisposed || !isRequested || running || timer !== undefined) return;
    const wait: number = lastEndedAt + intervalMs - Date.now();
    if (wait <= 0) return start();
    timer = setTimeout(() => {
      timer = undefined;
      start();
    }, wait);
  }
  return {
    request: (): void => {
      isRequested = true;
      schedule();
    },
    dispose: (): void => {
      isDisposed = true;
      clearTimeout(timer);
      running?.abort();
    },
  };
}
