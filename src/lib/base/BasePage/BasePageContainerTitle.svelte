<script lang="ts">
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { breakPointWidths } from "@utils/utilsDom";
  import classNames from "classnames";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let titleText: string;
  export let titleCategoryLabelText: string;
  export let isVerticalTitle: boolean;
  let titleTextSize: BaseSize;
  $: titleTextSize =
    $storeNoDbCurrentWidth <= breakPointWidths.sm
      ? changeSize(sizeSettings.title, -3)
      : sizeSettings.title;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<div class={classNames("flex", "flex-row", "justify-between", "max-w-4xl")}>
  <div
    class={classNames(
      "flex",
      "flex-col",
      "justify-items-start",
      "items-center",
      "sm:flex-row",
      "sm:space-x-5",
      "w-full",
      ""
    )}
  >
    <div
      class={classNames(
        "flex",
        isVerticalTitle ? "flex-col" : "flex-row",
        isVerticalTitle ? "self-start" : "self-center",
        isVerticalTitle ? "" : "sm:space-x-3",
        "justify-items-start",
        "w-fit"
      )}
    >
      <!-- <BaseLabel
        text={titleCategoryLabelText}
        textSize={titleTextSize}
        colorCategoryFront={colorCategoryBg}
        colorCategoryBg={colorCategoryFront}
        appendClass={classNames(
          // "font-medium",
          "px-1",
          "rounded",
          ""
        )}
      /> -->
      <div
        class={classNames(
          "rounded-lg px-1 border-4 border-double",
          colorDefinitions[themeColor][colorSettings.main].border,
          "border-inherit",
          ""
        )}
      >
        <BaseLabel
          text={titleCategoryLabelText}
          textSize={changeSize(titleTextSize, -3)}
          colorCategoryFront={colorSettings.main}
        />
      </div>
      <BaseLabel
        text={titleText}
        textSize={titleTextSize}
        colorCategoryFront={colorSettings.main}
        appendClass={classNames()}
      />
    </div>
  </div>
</div>
