<script lang="ts" context="module">
  export type PageWrapperTitleProps = {
    titleText: string;
    titleCategoryLabelText: string;
  };
</script>

<script lang="ts">
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";

  export let titleText: PageWrapperTitleProps["titleText"];
  export let titleCategoryLabelText: PageWrapperTitleProps["titleCategoryLabelText"];
  export let isFullScreen: boolean = false;

  let titleCategorySize: BaseSize;
  let titleTextSize: BaseSize;
  let titleTextColorCategory: ColorCategory;

  $: {
    if (isFullScreen) {
      titleCategorySize = changeSize(sizeSettings.title, -5);
      titleTextSize = changeSize(sizeSettings.title, -4);
      titleTextColorCategory = colorSettings.titleTextFullScreen;
    } else {
      titleCategorySize = changeSize(sizeSettings.title, -2);
      titleTextSize = sizeSettings.title;
      titleTextColorCategory = colorSettings.titleTextNormal;
    }
  }
</script>

<div
  class={classNames(
    "flex",
    "w-full",
    "h-fit",
    "flex-row",
    "items-center",
    "space-x-1",
    isFullScreen ? "pt-1.5 pl-1.5" : "pb-3",
  )}
>
  <BaseLabel
    text={titleCategoryLabelText}
    textSize={titleCategorySize}
    colorCategoryBg={colorSettings.titleCategoryBg}
    colorCategoryFront={colorSettings.titleCategoryFront}
    appendClass={classNames(
      "rounded",
      "px-1",
      "py-0.5",
      // "text-shadow-white"
    )}
    fontWeight="font-black"
  />
  <div class={classNames("overflow-x-hidden", "w-fit")}>
    <BaseLabel
      text={titleText}
      textSize={titleTextSize}
      colorCategoryFront={titleTextColorCategory}
      appendClass={classNames("pl-1")}
      fontWeight="font-black"
      truncate
      fontMono
    />
  </div>
</div>
