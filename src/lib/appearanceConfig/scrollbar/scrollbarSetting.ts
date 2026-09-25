import classNames from "classnames";
import type {
  ColorCategory,
  ColorDefinitionForParts,
} from "../color/colorDefinitions";
import { colorClasses } from "../color/colorVariables";

export type ScrollbarStyle = {
  thin: string;
  thick: string;
};
export const getScrollbarStyle = (
  colorCategory: ColorCategory,
): ScrollbarStyle => {
  const colorParts: ColorDefinitionForParts = colorClasses[colorCategory];

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
