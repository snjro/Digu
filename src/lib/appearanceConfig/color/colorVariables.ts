import {
  colorDefinitions,
  type ColorCategory,
  type ColorDefinitionCategories,
  type ColorDefinitionForParts,
} from "./colorDefinitions";

type ColorPart = keyof ColorDefinitionForParts;

const colorCategories = Object.keys(colorDefinitions.light) as ColorCategory[];
const colorParts = Object.keys(
  colorDefinitions.light[colorCategories[0]],
) as ColorPart[];

type ParsedClass = {
  utility: string; // e.g. "hover:bg"
  color: string; // e.g. "stone-200"
  opacity: string | undefined; // e.g. "50"
};

function parseColorClass(colorClass: string): ParsedClass {
  const match =
    /^((?:hover:|placeholder:)?(?:scrollbar-(?:thumb|track|corner)|[a-z]+))-([a-z]+-\d+)(?:\/(\d+))?$/.exec(
      colorClass,
    );
  if (!match) throw new Error(`Unknown color class: ${colorClass}`);
  return { utility: match[1], color: match[2], opacity: match[3] };
}

function kebab(part: ColorPart): string {
  return part.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

// The theme decides only the color. The utility and the opacity are the same.
function parsePart(category: ColorCategory, part: ColorPart) {
  const light = parseColorClass(colorDefinitions.light[category][part]);
  const dark = parseColorClass(colorDefinitions.dark[category][part]);
  if (light.utility !== dark.utility || light.opacity !== dark.opacity) {
    throw new Error(`Light and dark differ in more than the color: ${part}`);
  }
  const name = `${category}-${kebab(part)}`;
  const className = `${light.utility}-${name}${light.opacity ? `/${light.opacity}` : ""}`;
  return { name, className, light: light.color, dark: dark.color };
}

/** The CSS variable of a color, such as `var(--c-primary-bg)`. */
export function colorVar(category: ColorCategory, part: ColorPart): string {
  return `var(--c-${category}-${kebab(part)})`;
}

/** The classes of colorDefinitions without the theme: `bg-primary-bg` for `bg-stone-100` and `bg-neutral-950`. */
export const colorClasses = Object.fromEntries(
  colorCategories.map((category) => [
    category,
    Object.fromEntries(
      colorParts.map((part) => [part, parsePart(category, part).className]),
    ),
  ]),
) as ColorDefinitionCategories;

/** The text of themeColors.css. */
export function buildThemeColorsCss(): string {
  const parts = colorCategories.flatMap((category) =>
    colorParts.map((part) => parsePart(category, part)),
  );
  const variables = (theme: "light" | "dark") =>
    parts.map((p) => `  --c-${p.name}: var(--color-${p[theme]});`);
  return [
    "/* Made from colorDefinitionsLight.ts and colorDefinitionsDark.ts by colorVariables.ts. */",
    "/* Update it with `npx vitest run -u colorVariables`. Do not edit it by hand. */",
    "",
    ":root {",
    ...variables("light"),
    "}",
    "",
    ".dark {",
    ...variables("dark"),
    "}",
    "",
    "@theme inline {",
    ...parts.map((p) => `  --color-${p.name}: var(--c-${p.name});`),
    "}",
    "",
    "/* colorClasses makes these class names at run time, so Tailwind cannot find them in the code. */",
    ...parts.map((p) => `@source inline("${p.className}");`),
    "",
  ].join("\n");
}
