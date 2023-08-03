import classNames from "classnames";
import type { ThemeColor } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import { get } from "svelte/store";
import {
  colorDefinitions,
  type ColorCategory,
  type ColorDefinitionForParts,
} from "../color/colorDefinitions";

export const scrollbarStyle = (colorCategory: ColorCategory) => {
  const themeColor: ThemeColor = get(storeUserSettings)
    .themeColor as ThemeColor;

  const colorParts: ColorDefinitionForParts =
    colorDefinitions[themeColor][colorCategory];

  const scrollbarColors: string = classNames(
    colorParts.scrollbarThumb,
    colorParts.scrollbarTrack,
    colorParts.scrollbarCorner,
  );
  return {
    thin: classNames("scrollbar-thin", scrollbarColors),
    thick: classNames("scrollbar", scrollbarColors),
  };
};
