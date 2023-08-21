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
  import classNames from "classnames";
  import {
    getScrollbarStyle,
    type ScrollbarStyle,
  } from "$lib/appearanceConfig/scrollbar/scrollbarSetting";

  export let targetLanguageName: keyof typeof languages;
  export let code: string;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  let highlightStyle: string;
  $: highlightStyle =
    themeColor === "light" ? highlightStyleLight : highlightStyleDark;

  const languages = { json: json };

  let colorBg: `bg-${string}`;
  $: colorBg = colorDefinitions[themeColor][colorSettings.itemGroupContent].bg;
  let colorHexBg: `#${string}`;
  $: colorHexBg = getColorHexWithSharpFromTailwindColor(colorBg);

  let scrollbarStyle: ScrollbarStyle;
  $: scrollbarStyle = getScrollbarStyle(colorSettings.tabSelected, themeColor);
</script>

<svelte:head>
  <!-- eslint-disable svelte/no-at-html-tags -->
  {@html highlightStyle}
</svelte:head>
<div class={classNames("min-h-0", "w-full", "h-full", "pr-1", "")}>
  <div
    class={classNames(
      "w-full",
      "h-full",
      "pr-1",
      "overflow-scroll",
      scrollbarStyle.thin
    )}
  >
    <Highlight
      language={languages[targetLanguageName]}
      {code}
      class="text-left"
      style={`--base-highlight-background-color:${colorHexBg}`}
    />
  </div>
</div>
