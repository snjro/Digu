import { browser } from "$app/environment";
import { error } from "@sveltejs/kit";
import { initialize } from "../initialization/initialize";
import "../app.css";
import { storeNodbShowLoader } from "@stores/storeNoDb";
import { customLogger } from "@utils/logger";

// If Vite hangs indefinitely in dev mode,
// then Disable SSR (server side rendering).
// Issue: https://github.com/vitejs/vite/issues/11468#issuecomment-1606439160
// Reference: https://kit.svelte.dev/docs/page-options#ssr
export const ssr = false;
export const csr = true;
export const prerender = true;

// "always" writes each page as `xxx/index.html`, so static servers such as
// GitHub Pages can open any URL directly. With "never", `xxx.html` sits next to
// the `xxx/` folder of its child pages, and GitHub Pages redirects `/xxx` to `/xxx/`.
export const trailingSlash: "never" | "always" | "ignore" = "always";

export async function load(): Promise<void> {
  if (browser) {
    storeNodbShowLoader.set(true);
    try {
      await initialize();
    } catch (cause) {
      // SvelteKit does not log an HttpError, so log the original error here.
      customLogger.error("initialize()", cause);
      // The static error page shows this message when the app cannot start.
      error(
        500,
        `Digu needs the browser storage (IndexedDB) to start. Cause: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    } finally {
      storeNodbShowLoader.set(false);
    }
  }
}
