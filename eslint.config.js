import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import svelte from "eslint-plugin-svelte";
import { defineConfig } from "eslint/config";
import globals from "globals";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

export default defineConfig(
  {
    ignores: [
      ".svelte-kit/",
      "build/",
      "_build/",
      "package/",
      "coverage/",
      ".claude/",
      "**/*.test.ts",
    ],
  },
  js.configs.recommended,
  ts.configs.recommended,
  svelte.configs.recommended,
  prettier,
  svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Crashes on ESLint 10: https://github.com/sveltejs/eslint-plugin-svelte/issues/1515
      "svelte/no-reactive-functions": "off",
      // Rules newly reported after the upgrade. Still off: the code has not been fixed for them yet.
      "no-useless-assignment": "off",
      "preserve-caught-error": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": ["error", { caughtErrors: "none" }],
      "svelte/no-navigation-without-resolve": "off",
      "svelte/no-useless-mustaches": "off",
      "svelte/require-each-key": "off",
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
        extraFileExtensions: [".svelte"],
        svelteConfig,
      },
    },
    rules: {
      // TS checks types. Type parameters in generics= are reported as undefined.
      "no-undef": "off",
    },
  },
);
