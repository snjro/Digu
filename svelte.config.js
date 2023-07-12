import adapter from "@sveltejs/adapter-auto";
// import sveltePreprocess from "svelte-preprocess";
import { vitePreprocess } from "@sveltejs/kit/vite";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors

  // preprocess: sveltePreprocess(),
  preprocess: vitePreprocess(),

  // noExternal: ["svelte-hero-icons"],
  kit: {
    adapter: adapter(),
    alias: {
      "@db/*": "src/db/*",
      "@stores/*": "src/stores/*",
      "@constants/*": "src/constants/*",
      "@utils/*": "src/utils/*",
      "@routes/*": "src/routes/*",
      "@static/*": "src/static/*",
      "@eventLogs": "src/eventLogs/*",
    },
  },
};

export default config;
