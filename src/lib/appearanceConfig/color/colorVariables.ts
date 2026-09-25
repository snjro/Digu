import colors from "tailwindcss/colors";
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

// The Tailwind utility of each part: "hover:bg" makes "hover:bg-primary-bg-hover".
const utilities: { [key in ColorPart]: string } = {
  text: "text",
  textEmphasis: "text",
  textPlaceholder: "placeholder:text",
  fill: "fill",
  fillEmphasis: "fill",
  bg: "bg",
  bgEmphasis: "bg",
  bgHover: "hover:bg",
  shadow: "shadow",
  border: "border",
  scrollbarThumb: "scrollbar-thumb",
  scrollbarTrack: "scrollbar-track",
  scrollbarCorner: "scrollbar-corner",
  accent: "accent",
};

function kebab(part: ColorPart): string {
  return part.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function parsePart(category: ColorCategory, part: ColorPart) {
  const name = `${category}-${kebab(part)}`;
  return {
    name,
    className: `${utilities[part]}-${name}`,
    light: colorDefinitions.light[category][part],
    dark: colorDefinitions.dark[category][part],
  };
}

/** The CSS variable of a color, such as `var(--c-primary-bg)`. */
export function colorVar(category: ColorCategory, part: ColorPart): string {
  return `var(--c-${category}-${kebab(part)})`;
}

/** The CSS variable of the dots image of a progress bar, in the bg color of the category. */
export function dotsImageVar(category: ColorCategory): string {
  return `var(--c-${category}-dots-image)`;
}

// The dots are an SVG image, which cannot read the CSS variables of the page.
function dotsImage(color: string): string {
  const [name, shade] = color.split("-");
  const value = (colors as unknown as Record<string, Record<string, string>>)[
    name
  ][shade];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24"><path fill="${value}" d="M12,10A2,2 0 0,0 10,12C10,13.11 10.9,14 12,14C13.11,14 14,13.11 14,12A2,2 0 0,0 12,10Z" /></svg>`;
  return `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}")`;
}

/** The classes of colorDefinitions without the theme: `bg-primary-bg` for `stone-100` and `neutral-950`. */
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
  const variables = (theme: "light" | "dark") => [
    ...parts.map((p) => `  --c-${p.name}: var(--color-${p[theme]});`),
    ...colorCategories.map(
      (category) =>
        `  --c-${category}-dots-image: ${dotsImage(colorDefinitions[theme][category].bg)};`,
    ),
  ];
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
