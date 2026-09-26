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
      "@typescript-eslint/no-unused-vars": ["error", { caughtErrors: "none" }],
      // Crashes on ESLint 10: https://github.com/sveltejs/eslint-plugin-svelte/issues/1515
      "svelte/no-reactive-functions": "off",
      // BaseA and BaseButton take hrefs built at runtime, some of them external
      // (chain explorers, GitHub), so resolve() cannot be used without reworking them.
      "svelte/no-navigation-without-resolve": "off",
      // ag-grid runs a string expression with new Function, which the Content
      // Security Policy (kit.csp in svelte.config.js) blocks: no 'unsafe-eval'.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'Property:matches([key.name=/^(valueGetter|valueFormatter|valueSetter|valueParser|filterValueGetter)$/], [key.value=/^(valueGetter|valueFormatter|valueSetter|valueParser|filterValueGetter)$/]):matches([value.type="TemplateLiteral"], [value.raw=/^["\']/])',
          message:
            "Use a function. ag-grid runs a string expression with new Function, which the Content Security Policy blocks.",
        },
        {
          selector:
            'Property:matches([key.name="cellClassRules"], [key.value="cellClassRules"]) > ObjectExpression > Property:matches([value.type="TemplateLiteral"], [value.raw=/^["\']/])',
          message:
            "Use a function. ag-grid runs a string expression with new Function, which the Content Security Policy blocks.",
        },
      ],
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
