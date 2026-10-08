// A BroadcastChannel to the other tabs. This tab does not get its own
// messages, and posts only once it watches: the startup watches before any
// lock is taken. post() throws when the message cannot be sent. A message
// comes as unknown: a tab on another build may send another shape.
export type TabChannel<T> = {
  watch: () => void;
  post: (message: T) => void;
  // For the tests.
  stop: () => void;
};

export function createTabChannel<T>(
  name: string,
  onMessage: (message: unknown) => void,
): TabChannel<T> {
  let channel: BroadcastChannel | undefined;
  return {
    watch: (): void => {
      if (typeof BroadcastChannel === "undefined" || channel) return;
      channel = new BroadcastChannel(name);
      channel.addEventListener("message", (event: MessageEvent<unknown>) =>
        onMessage(event.data),
      );
    },
    post: (message: T): void => {
      channel?.postMessage(message);
    },
    stop: (): void => {
      channel?.close();
      channel = undefined;
    },
  };
}
