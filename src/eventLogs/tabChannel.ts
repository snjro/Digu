import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain, ChainName } from "#constants/chains/types.js";

// A BroadcastChannel that tells the other tabs about a chain. This tab does
// not get its own messages, and posts only once it watches: the startup
// watches before any lock is taken. post() throws when the message cannot be
// sent.
export type TabChannel = {
  watch: () => void;
  post: (chainName: ChainName) => void;
  // For the tests.
  stop: () => void;
};

type ChainMessage = { chainName: ChainName };

export function createTabChannel(
  name: string,
  onChain: (chainName: ChainName) => void,
): TabChannel {
  let channel: BroadcastChannel | undefined;
  return {
    watch: (): void => {
      if (typeof BroadcastChannel === "undefined" || channel) return;
      channel = new BroadcastChannel(name);
      channel.addEventListener("message", (event: MessageEvent<unknown>) => {
        const chainName: ChainName | undefined = getChainName(event.data);
        if (chainName !== undefined) onChain(chainName);
      });
    },
    post: (chainName: ChainName): void => {
      const message: ChainMessage = { chainName };
      channel?.postMessage(message);
    },
    stop: (): void => {
      channel?.close();
      channel = undefined;
    },
  };
}

// Undefined when the message names no chain of the app, as from a tab on
// another build.
function getChainName(message: unknown): ChainName | undefined {
  const chainName: unknown = (message as Partial<ChainMessage> | null)
    ?.chainName;
  return TARGET_CHAINS.some((chain: Chain) => chain.name === chainName)
    ? (chainName as ChainName)
    : undefined;
}
