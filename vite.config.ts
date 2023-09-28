import { sveltekit } from "@sveltejs/kit/vite";
import type { UserConfig } from "vite";
import circleDependency from "vite-plugin-circular-dependency";

const config: UserConfig = {
  server: {
    host: "localhost",
    // host: "0.0.0.0",
    strictPort: true,
    port: 5173,
    open: false,
    hmr: true,
    fs: {
      // Allow serving files from one level up to the project root
      allow: [".."],
    },
  },
  plugins: [sveltekit(), circleDependency({})],
  test: {
    globals: true,
    environment: "happy-dom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "json"],
    },
  },
};

export default config;
