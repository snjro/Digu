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
