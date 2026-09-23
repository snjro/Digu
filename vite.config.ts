import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { configDefaults } from "vitest/config";
import type { UserConfig } from "vite";

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
  plugins: [tailwindcss(), sveltekit()],
  test: {
    globals: true,
    // Keep calls recorded at collection time (Vitest 5 defaults to true)
    clearMocks: false,
    environment: "happy-dom",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "json"],
    },
    projects: [
      {
        extends: true,
        plugins: [svelteTesting()],
        test: {
          name: "client",
          include: ["src/**/*.svelte.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "server",
          include: ["src/**/*.test.ts"],
          exclude: [...configDefaults.exclude, "src/**/*.svelte.test.ts"],
        },
      },
    ],
  },
};

export default config;
