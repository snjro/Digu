<script lang="ts">
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";

  export let titleText: string;
  export let titleCategoryLabelText: string;
  export let isFullScreen: boolean = false;

  let titleCategorySize: BaseSize;
  let titleTextSize: BaseSize;
  let flexStyle: string;
  let titleTextColorCategory: ColorCategory;

  $: {
    if (isFullScreen) {
      titleCategorySize = changeSize(sizeSettings.title, -5);
      titleTextSize = changeSize(sizeSettings.title, -4);
      flexStyle = classNames("flex-col", "justify-start");
      titleTextColorCategory = colorSettings.titleTextFullScreen;
    } else {
      titleCategorySize = changeSize(sizeSettings.title, -2);
      titleTextSize = sizeSettings.title;
      flexStyle = classNames("flex-row", "items-center", "space-x-1");
      titleTextColorCategory = colorSettings.titleTextNormal;
    }
  }
</script>

<div class={classNames("flex", "w-full", flexStyle)}>
  <BaseLabel
    text={titleCategoryLabelText}
    textSize={titleCategorySize}
    colorCategoryBg={colorSettings.titleCategoryBg}
    colorCategoryFront={colorSettings.titleCategoryFront}
    appendClass={classNames(
      "rounded",
      "px-1",
      "py-0"
      // "text-shadow-white"
    )}
    fontWeight="font-black"
  />
  <div class={classNames("overflow-x-auto", "w-full")}>
    <BaseLabel
      text={titleText}
      textSize={titleTextSize}
      colorCategoryFront={titleTextColorCategory}
      colorCategoryBg={titleTextColorCategory}
      appendClass={classNames("pl-1")}
      fontWeight="font-black"
      truncate
    />
  </div>
</div>
