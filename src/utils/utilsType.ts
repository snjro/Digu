// get the keys of an object type whose values are of a given type.
// reference: https://zenn.dev/shztmk/articles/02_typescript-key-matching
// https://stackoverflow.com/questions/54520676/in-typescript-how-to-get-the-keys-of-an-object-type-whose-values-are-of-a-given/54520829#54520829
export type KeysMatching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never;
}[keyof T];
