import type { ThemeColor } from "@db/dbTypes";
import { colorDefinitionsDark } from "./colorDefinitionsDark";
import { colorDefinitionsLight } from "./colorDefinitionsLight";

/** The classes of colorClasses. */
export type ColorDefinitionForParts = {
  text: `text-${string}`;
  textEmphasis: `text-${string}`;
  textPlaceholder: `placeholder:text-${string}`;
  fill: `fill-${string}`;
  fillEmphasis: `fill-${string}`;
  bg: `bg-${string}`;
  bgEmphasis: `bg-${string}`;
  bgHover: `hover:bg-${string}`;
  shadow: `shadow-${string}`;
  border: `border-${string}`;
  scrollbarThumb: `scrollbar-thumb-${string}`;
  scrollbarTrack: `scrollbar-track-${string}`;
  scrollbarCorner: `scrollbar-corner-${string}`;
  accent: `accent-${string}`;
};
export type ColorCategory =
  "success" | "error" | "interactive" | "primary" | "secondary" | "white";
export type ColorDefinitionCategories = {
  [key in ColorCategory]: ColorDefinitionForParts;
};
/** The Tailwind color of each part, such as "stone-100". */
export type ColorNameCategories = {
  [key in ColorCategory]: {
    [key in keyof ColorDefinitionForParts]: `${string}-${number}`;
  };
};
type ColorDefinitions = {
  [key in ThemeColor]: ColorNameCategories;
};
export const colorDefinitions: ColorDefinitions = {
  light: colorDefinitionsLight,
  dark: colorDefinitionsDark,
};
