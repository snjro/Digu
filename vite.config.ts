import { sveltekit } from "@sveltejs/kit/vite";
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
  plugins: [sveltekit()],
};

export default config;
