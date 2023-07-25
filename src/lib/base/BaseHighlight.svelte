<script lang="ts">
  import type { ThemeColor } from "@db/dbTypes";
  import Highlight from "svelte-highlight";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import json from "svelte-highlight/languages/json";
  import highlightStyleDark from "svelte-highlight/styles/github-dark";
  import highlightStyleLight from "svelte-highlight/styles/github";
  import {
    colorDefinitions,
    getColorHexWithSharpFromTailwindColor,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import "./baseHighlight.css";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let targetLanguageName: keyof typeof languages;
  export let code: string;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  let highlightStyle: string;
  $: highlightStyle =
    themeColor === "light" ? highlightStyleLight : highlightStyleDark;

  const languages = { json: json };

  let colorHexBg: `#${string}`;
  $: colorHexBg = getColorHexWithSharpFromTailwindColor(
    colorDefinitions[themeColor][colorSettings.itemGroupContent].bg
  );
</script>

<svelte:head>
  <!-- eslint-disable svelte/no-at-html-tags -->
  {@html highlightStyle}
</svelte:head>
<Highlight
  language={languages[targetLanguageName]}
  {code}
  class="text-left"
  style={`--base-highlight-background-color:${colorHexBg}`}
/>
