import { describe, expect, test } from "vitest";
import {
  colorDefinitions,
  type ColorCategory,
  type ColorDefinitionForParts,
} from "./colorDefinitions";
import colors from "tailwindcss/colors";
import {
  buildThemeColorsCss,
  colorClasses,
  colorVar,
  dotsImageVar,
} from "./colorVariables";

describe("colorVariables", () => {
  test("themeColors.css is made from the color tables", async () => {
    await expect(buildThemeColorsCss()).toMatchFileSnapshot(
      "./themeColors.css",
    );
  });

  test.each(["light", "dark"] as const)(
    "the variables of %s have the colors of its table",
    (theme) => {
      const css = buildThemeColorsCss();
      const block = css
        .split(theme === "light" ? ":root {" : ".dark {")[1]
        .split("}")[0];
      for (const [category, parts] of Object.entries(colorDefinitions[theme])) {
        for (const [part, color] of Object.entries(parts)) {
          const variable = colorVar(
            category as ColorCategory,
            part as keyof ColorDefinitionForParts,
          ).slice("var(".length, -1);
          expect(block).toContain(`${variable}: var(--color-${color});`);
        }
      }
    },
  );

  test.each(["light", "dark"] as const)(
    "the dots images of %s have the bg colors of its table",
    (theme) => {
      const block = buildThemeColorsCss()
        .split(theme === "light" ? ":root {" : ".dark {")[1]
        .split("}")[0];
      for (const [category, parts] of Object.entries(colorDefinitions[theme])) {
        const [name, shade] = parts.bg.split("-");
        const value = (
          colors as unknown as Record<string, Record<string, string>>
        )[name][shade];
        const line = block
          .split("\n")
          .find((l) => l.includes(`--c-${category}-dots-image:`));
        expect(line).toContain(encodeURIComponent(`fill="${value}"`));
      }
      expect(dotsImageVar("interactive")).toBe(
        "var(--c-interactive-dots-image)",
      );
    },
  );

  test("colorClasses names the classes by the utility of each part", () => {
    expect(colorClasses.primary.bg).toBe("bg-primary-bg");
    expect(colorClasses.primary.bgHover).toBe("hover:bg-primary-bg-hover");
    expect(colorClasses.secondary.scrollbarThumb).toBe(
      "scrollbar-thumb-secondary-scrollbar-thumb",
    );
    expect(colorClasses.white.textPlaceholder).toBe(
      "placeholder:text-white-text-placeholder",
    );
    expect(Object.keys(colorClasses)).toEqual(
      Object.keys(colorDefinitions.light),
    );
  });

  test("colorVar names the variable of a color", () => {
    expect(colorVar("interactive", "bg")).toBe("var(--c-interactive-bg)");
    expect(colorVar("primary", "bgHover")).toBe("var(--c-primary-bg-hover)");
  });
});
