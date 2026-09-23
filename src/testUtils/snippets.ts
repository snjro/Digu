import { createRawSnippet, type Snippet } from "svelte";

/** A snippet that renders `html`, which must have one root element. */
export function htmlSnippet(html: string): Snippet {
  return createRawSnippet(() => ({ render: () => html }));
}

/**
 * Props that fill slots with snippets, for `render(Component, props)`.
 * A legacy component reads a snippet only when `$$slots` flags it, which is
 * what the compiler passes from a parent that uses `{#snippet}`. A runes
 * component reads the snippet props, so the same props work before and after
 * the rewrite to runes. `children` fills the default slot.
 */
export function slotProps(
  snippets: Record<string, Snippet>,
): Record<string, unknown> {
  const flags = Object.fromEntries(
    Object.keys(snippets).map((name) => [
      name === "children" ? "default" : name,
      true,
    ]),
  );
  return { ...snippets, $$slots: flags };
}
