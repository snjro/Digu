import { getSyncLockName, getSyncPresenceLockName } from "#db/constants.js";

// Holds the locks of an operation (a sync, an import or a reset) of another
// tab on the chain, as runWithSyncLock() does, until release() is called, or
// until `operation` resolves when it is given. `held` resolves once both
// locks are released.
export function holdOperationOfOtherTab(
  chainName: string,
  operation?: () => Promise<unknown>,
): { held: Promise<void>; release: () => void } {
  let release: () => void = () => {};
  const released: Promise<void> = new Promise<void>(
    (resolve) => (release = resolve),
  );
  const held: Promise<void> = navigator.locks.request(
    getSyncLockName(chainName),
    () =>
      navigator.locks.request(getSyncPresenceLockName(chainName), async () => {
        await (operation ? operation() : released);
      }),
  );
  return { held, release };
}
