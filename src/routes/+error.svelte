<script lang="ts">
  import { page } from "$app/stores";
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import BaseButton from "$lib/base/BaseButton.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { GITHUB_PAGES_HOST_NAME, PROJECT_NAME } from "@utils/utilsCostants";
  import classNames from "classnames";

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;
  const colorCategory: ColorCategory = colorSettings.errorPage;
  const errorDetails: { title: string; value: string | undefined }[] = [
    { title: "Status", value: $page.status.toString() },
    { title: "Message", value: $page.error?.message },
  ];
</script>

<div
  class={classNames(
    "flex",
    "flex-col",
    "w-fit",
    "items-start",
    "space-y-3",
    "pt-3",
    colorDefinitions[themeColor][colorCategory].bg,
    "",
  )}
>
  <BaseLabel
    textSize="2xl"
    text="Error"
    colorCategoryFront={colorCategory}
    fontMono
  />

  <div
    class={classNames(
      "flex",
      "flex-col",
      "border-y",
      colorDefinitions[themeColor][colorCategory].border,
      "pl-3",
      "",
    )}
  >
    {#each errorDetails as errorDetail}
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
      href={$page.url.hostname.includes(GITHUB_PAGES_HOST_NAME)
        ? `/${PROJECT_NAME}`
        : "/"}
      border
      shadowEffect
      hoverEffect
      popupEffect
      colorCategoryFront={"white"}
      colorCategoryBg={"interactive"}
    />
  </div>
</div>
