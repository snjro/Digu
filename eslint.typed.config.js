import { defineConfig } from "eslint/config";
import baseConfig from "./eslint.config.js";

// The rules that need type information. Kept out of eslint.config.js because
// type checking makes linting much slower. Run with `npm run lint:types`.
export default defineConfig(
  baseConfig,
  // No tsconfig includes them. eslint.config.js lints them without types.
  { ignores: ["eslint.config.js", "eslint.typed.config.js", "scripts/"] },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
);
