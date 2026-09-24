<script lang="ts" module>
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

  interface Props {
    items: BaseSelectProps["items"];
    value: BaseSelectProps["value"];
    size: NonNullable<BaseSelectProps["size"]>;
    colorCategoryFront?: BaseSelectProps["colorCategory"];
    colorCategoryBg?: BaseSelectProps["colorCategory"];
    forcedClass?: BaseSelectProps["forcedClass"];
    appendClass?: BaseSelectProps["appendClass"];
    onchange?: ((event: Event) => void) | undefined;
  }

  let {
    items,
    value = $bindable(),
    size,
    colorCategoryFront = undefined,
    colorCategoryBg = undefined,
    forcedClass = undefined,
    appendClass = undefined,
    onchange = undefined,
  }: Props = $props();

  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  let customClass: string = $derived(
    forcedClass ??
      classNames(
        "form-select",
        "rounded-sm",
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
        "outline-hidden",
        baseTextSizes[size],
        "cursor-pointer",
        // "appearance-none",
        appendClass,
      ),
  );
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "justify-items-center",
    "rounded-sm",
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
  <select bind:value class={customClass} {onchange}>
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
