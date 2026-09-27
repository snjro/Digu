import { tick } from "svelte";

async function runMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

/**
 * Picks an option like a user. A browser keeps the select focused, fires
 * input and then change, and runs the microtasks after each listener.
 * happy-dom does not match `option:checked`, so bind:value reads the first
 * option: pick the first one.
 */
export async function selectAsUser(
  select: HTMLSelectElement,
  value: string,
): Promise<void> {
  select.focus();
  select.value = value;
  select.dispatchEvent(new Event("input", { bubbles: true }));
  await runMicrotasks();
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await runMicrotasks();
  await tick();
}
