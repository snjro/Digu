import { describe, expect, test } from "vitest";
import {
  colorDefinitions,
  type ColorCategory,
  type ColorDefinitionForParts,
} from "./colorDefinitions";
import { buildThemeColorsCss, colorClasses, colorVar } from "./colorVariables";

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
        for (const [part, colorClass] of Object.entries(parts)) {
          // "hover:bg-stone-200" -> "stone-200", "text-red-600/50" -> "red-600"
          const color = /-([a-z]+-\d+)(?:\/\d+)?$/.exec(colorClass)?.[1];
          const variable = colorVar(
            category as ColorCategory,
            part as keyof ColorDefinitionForParts,
          ).slice("var(".length, -1);
          expect(block).toContain(`${variable}: var(--color-${color});`);
        }
      }
    },
  );

  test("colorClasses keeps the utility and the opacity of the tables", () => {
    expect(colorClasses.primary.bg).toBe("bg-primary-bg");
    expect(colorClasses.primary.bgHover).toBe("hover:bg-primary-bg-hover");
    expect(colorClasses.error.textOpacity).toBe("text-error-text-opacity/50");
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
