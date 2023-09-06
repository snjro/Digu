<script lang="ts">
  import {
    colorDefinitions,
    getColorHexWithSharpFromTailwindColor,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import Highlight from "svelte-highlight";
  import json from "svelte-highlight/languages/json";
  import highlightStyleLight from "svelte-highlight/styles/github";
  import highlightStyleDark from "svelte-highlight/styles/github-dark";
  import "./baseHighlight.css";
  import { baseTextSizes } from "./baseSizes";

  export let targetLanguageName: keyof typeof languages;
  export let code: string;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;

  let highlightStyle: string;
  $: highlightStyle =
    themeColor === "light" ? highlightStyleLight : highlightStyleDark;

  const languages = { json: json };

  let colorBg: `bg-${string}`;
  $: colorBg = colorDefinitions[themeColor][colorSettings.itemGroupContent].bg;
  let colorHexBg: `#${string}`;
  $: colorHexBg = getColorHexWithSharpFromTailwindColor(colorBg);
</script>

<svelte:head>
  <!-- eslint-disable svelte/no-at-html-tags -->
  {@html highlightStyle}
</svelte:head>
<Highlight
  language={languages[targetLanguageName]}
  class={classNames(
    "w-full",
    "min-w-fit",
    baseTextSizes[sizeSettings.abiJsonText],
  )}
  {code}
  style={classNames(`--base-highlight-background-color:${colorHexBg};`)}
/>
