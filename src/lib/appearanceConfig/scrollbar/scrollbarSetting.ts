import classNames from "classnames";
import type { ThemeColor } from "@db/dbTypes";
import {
  colorDefinitions,
  type ColorCategory,
  type ColorDefinitionForParts,
} from "../color/colorDefinitions";

export type ScrollbarStyle = {
  thin: string;
  thick: string;
};
export const getScrollbarStyle = (
  colorCategory: ColorCategory,
  themeColor: ThemeColor,
): ScrollbarStyle => {
  const colorParts: ColorDefinitionForParts =
    colorDefinitions[themeColor][colorCategory];

  const scrollbarColors: string = classNames(
    colorParts.scrollbarThumb,
    colorParts.scrollbarTrack,
    colorParts.scrollbarCorner,
  );
  const rounded: string = "scrollbar-thumb-rounded";
  return {
    thin: classNames("scrollbar-thin", rounded, scrollbarColors),
    thick: classNames("scrollbar", rounded, scrollbarColors),
  };
};
