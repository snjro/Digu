<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { type ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import BaseButton from "$lib/base/BaseButton.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import classNames from "classnames";

  const colorCategory: ColorCategory = colorSettings.errorPage;
  let errorDetails: { title: string; value: string | undefined }[] = $derived([
    { title: "Status", value: page.status.toString() },
    { title: "Message", value: page.error?.message },
  ]);
</script>

<div
  class={classNames(
    "flex",
    "flex-col",
    "w-fit",
    "items-start",
    "space-y-3",
    "pt-3",
    colorClasses[colorCategory].bg,
    "",
  )}
>
  <h1>
    <BaseLabel
      textSize="2xl"
      text="Error"
      colorCategoryFront={colorCategory}
      fontMono
    />
  </h1>

  <div
    class={classNames(
      "flex",
      "flex-col",
      "border-y",
      colorClasses[colorCategory].border,
      "pl-3",
      "",
    )}
  >
    {#each errorDetails as errorDetail (errorDetail.title)}
      <div class={classNames("flex", "flex-row", "space-x-3")}>
        <BaseLabel textSize="sm" text={errorDetail.title} appendClass="w-16" />
        <BaseLabel
          textSize="md"
          text={errorDetail.value ?? "No Message"}
          fontMono={errorDetail.value ? true : false}
          italic={errorDetail.value ? false : true}
        />
      </div>
    {/each}
  </div>
  <div class="self-center pt-3">
    <BaseButton
      size="md"
      label="HOME"
      href={`${base}/`}
      border
      shadowEffect
      hoverEffect
      popupEffect
      colorCategoryFront="white"
      colorCategoryBg="interactive"
    />
  </div>
</div>
