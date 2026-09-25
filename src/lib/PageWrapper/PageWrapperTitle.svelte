<script lang="ts" module>
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

  interface Props {
    titleText: PageWrapperTitleProps["titleText"];
    titleCategoryLabelText: PageWrapperTitleProps["titleCategoryLabelText"];
    isFullScreen?: boolean;
  }

  let {
    titleText,
    titleCategoryLabelText,
    isFullScreen = false,
  }: Props = $props();

  let titleCategorySize: BaseSize = $derived(
    isFullScreen
      ? changeSize(sizeSettings.title, -5)
      : changeSize(sizeSettings.title, -2),
  );
  let titleTextSize: BaseSize = $derived(
    isFullScreen ? changeSize(sizeSettings.title, -4) : sizeSettings.title,
  );
  let titleTextColorCategory: ColorCategory = $derived(
    isFullScreen
      ? colorSettings.titleTextFullScreen
      : colorSettings.titleTextNormal,
  );
</script>

<h1
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
      "rounded-sm",
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
</h1>
