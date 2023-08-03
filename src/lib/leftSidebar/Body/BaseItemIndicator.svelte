<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let isSelected: boolean = false;
  export let isHover: boolean = false;
  export let isUpdated: boolean = false;
  export let invisible: boolean = false;
  export let isTopLevelItem: boolean;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  let colorCategory: ColorCategory;
  // $: colorCategory = getFrontColorCategory(isSelected);
  $: colorCategory = isSelected ? "interactive" : colorSettings.dialogHeader;
  $: bgColor = isHover
    ? colorDefinitions[themeColor][colorCategory].bgEmphasis
    : colorDefinitions[themeColor][colorCategory].bg;

  $: height = (): `h-${string}` | string => {
    if (isSelected) {
      return "h-4/6";
    } else if (isUpdated) {
      return "h-1/3";
    } else if (isHover) {
      return "h-4/5";
    } else {
      return "self-stretch";
    }
  };
  $: left = (): `pl-${string}` => {
    return isTopLevelItem ? "pl-0.5" : "pl-1.5";
  };
  $: center = (): string => {
    if (isSelected) {
      return "w-[4px] rounded-br-full rounded-tr-full";
    } else if (isUpdated) {
      return "w-[6px] rounded-br-full rounded-tr-full";
    } else if (isHover) {
      return "w-[2px] rounded-none";
    } else {
      return classNames("w-px rounded-none", invisible && "invisible");
    }
  };
  $: right = (): `pr-${string}` => {
    if (isSelected) {
      return "pr-[2px]";
    } else if (isUpdated) {
      return "pr-[0px]";
    } else if (isHover) {
      return "pr-[4px]";
    } else {
      return "pr-[5px]";
    }
  };
</script>

<div class={classNames("flex flex-row", height(), "w-fit", "")}>
  <div class={left()} />
  <div class={classNames(bgColor, center(), "")} />
  <div class={right()} />
</div>
