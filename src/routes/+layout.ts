import { browser } from "$app/environment";
import { initialize } from "../initialization/initialize";
// import "../app.css";
import "../app.postcss";
export type LoadDataRoot = { initializing: boolean };

// If Vite hangs indefinitely in dev mode,
// then Disable SSR (server side rendering).
// Issue: https://github.com/vitejs/vite/issues/11468#issuecomment-1606439160
// Reference: https://kit.svelte.dev/docs/page-options#ssr
export const ssr = false;
export const csr = true;
export const prerender = true;

// On IPFS, if `trailingSlash` was set `never`(default) and a page is opened by using URL directly,
// then you got the error `Cannot GET /xxx/yyy/zzz`.
// Therefore, you need to set "always" here.
export const trailingSlash: "never" | "always" | "ignore" = "always";

export async function load(): Promise<LoadDataRoot> {
  if (browser) {
    await initialize();
    return { initializing: false };
  } else {
    return { initializing: true };
  }
}
