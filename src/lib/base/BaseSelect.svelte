<script lang="ts" context="module">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import { baseTextSizes, type BaseSize } from "./baseSizes";

  export type BaseSelectProps = {
    items: {
      name: string;
      value: string;
    }[];
    value: string;
    size?: BaseSize;
    colorCategory?: ColorCategory;
    forcedClass?: string;
    appendClass?: string;
  };
</script>

<script lang="ts">
  import { baseShadowSizes } from "./baseSizes";

  export let items: BaseSelectProps["items"];
  export let value: BaseSelectProps["value"];
  export let size: NonNullable<BaseSelectProps["size"]>;
  export let colorCategoryFront: BaseSelectProps["colorCategory"] = undefined;
  export let colorCategoryBg: BaseSelectProps["colorCategory"] = undefined;
  export let forcedClass: BaseSelectProps["forcedClass"] = undefined;
  export let appendClass: BaseSelectProps["appendClass"] = undefined;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;

  let customClass: string;
  $: customClass =
    forcedClass ??
    classNames(
      "form-select",
      "rounded",
      "w-full",
      // "pr-2",
      // "py-0.5",
      "p-1",
      colorCategoryBg
        ? colorDefinitions[themeColor][colorCategoryBg].bg
        : "bg-inherit",
      colorCategoryFront
        ? colorDefinitions[themeColor][colorCategoryFront].text
        : "text-inherit",
      "dark:border-2",
      colorCategoryFront
        ? colorDefinitions[themeColor][colorCategoryFront].border
        : "border-inherit",

      "transition",
      "outline-none",
      baseTextSizes[size],
      "cursor-pointer",
      // "appearance-none",
      appendClass,
    );
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "justify-items-center",
    "rounded",
    colorCategoryBg
      ? colorDefinitions[themeColor][colorCategoryBg].bg
      : "bg-inherit",
    // "shadow-md dark:shadow-none",
    baseShadowSizes[size],
    "dark:shadow-none",
    colorCategoryFront
      ? colorDefinitions[themeColor][colorCategoryFront].shadow
      : "shadow-inherit",

    "h-fit w-fit",
    "",
  )}
>
  <select bind:value class={customClass} on:change on:input>
    {#each items as { value, name }}
      <option
        {value}
        class={classNames(
          colorCategoryBg
            ? colorDefinitions[themeColor][colorCategoryBg].bg
            : "bg-inherit",
          colorCategoryFront
            ? colorDefinitions[themeColor][colorCategoryFront].text
            : "text-inherit",
        )}
      >
        {name}
      </option>
    {/each}
  </select>
</div>
