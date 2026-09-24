<script lang="ts" module>
  export type BaseTooltipProps = {
    text?: string;
    xPosition?: "left" | "right";
    yPosition?: "top" | "bottom";
  };
</script>

<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";

  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { zIndex } from "$lib/appearanceConfig/zIndex";
  import classNames from "classnames";
  import type { Snippet } from "svelte";
  import { baseTextSizes } from "./baseSizes";
  interface Props {
    text: BaseTooltipProps["text"];
    xPosition?: BaseTooltipProps["xPosition"];
    yPosition?: BaseTooltipProps["yPosition"];
    children?: Snippet;
  }

  let {
    text,
    xPosition = "right",
    yPosition = "top",
    children,
  }: Props = $props();
  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  let textClass = $derived(
    classNames(
      "whitespace-nowrap",
      "rounded-md",
      colorDefinitions[themeColor][colorSettings.tooltip].bg,
      colorDefinitions[themeColor][colorSettings.tooltip].text,
      "px-1",
      "py-0.5",
      "absolute",
      xPosition === "left" ? "right-full" : "left-full",
      yPosition === "top" ? "bottom-full" : "top-full",
      baseTextSizes[sizeSettings.tooltip],
      zIndex.tooltip,
      "opacity-0",
      "group-hover:opacity-100",
      "transition",
      "pointer-events-none",
      "shadow-md dark:shadow-none",
      colorDefinitions[themeColor][colorSettings.tooltip].shadow,
      "dark:border",
      colorDefinitions[themeColor][colorSettings.tooltip].border,
      "",
    ),
  );
</script>

{#if text}
  <div class={classNames("relative", "group", "flex")}>
    <span class={textClass}>
      {text}
    </span>
    {@render children?.()}
  </div>
{:else}
  {@render children?.()}
{/if}
