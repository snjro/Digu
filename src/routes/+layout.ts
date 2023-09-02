import { browser } from "$app/environment";
import { initialize } from "../initialization/initialize";
// import "../app.css";
import "../app.postcss";
export type LoadDataRoot = { initializing: boolean };

// If Vite hangs indefinitely in dev mode,
// then Disable SSR (server side rendering).
// Issue: https://github.com/vitejs/vite/issues/11468#issuecomment-1606439160
// Reference: https://kit.svelte.dev/docs/page-options#ssr
export const ssr = true;

export async function load(): Promise<LoadDataRoot> {
  if (browser) {
    await initialize();
    return { initializing: false };
  } else {
    return { initializing: true };
  }
}
