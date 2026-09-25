<script lang="ts">
  import { colorVar } from "$lib/appearanceConfig/color/colorVariables";
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

  interface Props {
    targetLanguageName: keyof typeof languages;
    code: string;
  }

  let { targetLanguageName, code }: Props = $props();

  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  let highlightStyle: string = $derived(
    themeColor === "light" ? highlightStyleLight : highlightStyleDark,
  );

  const languages = { json: json };

  const colorBgValue: string = colorVar(colorSettings.itemGroupContent, "bg");
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
    "whitespace-pre-wrap",
    baseTextSizes[sizeSettings.abiJsonText],
  )}
  {code}
  style={classNames(`--base-highlight-background-color:${colorBgValue};`)}
/>
