<script lang="ts" context="module">
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

  import classNames from "classnames";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  export let text: BaseTooltipProps["text"];
  export let xPosition: BaseTooltipProps["xPosition"] = "right";
  export let yPosition: BaseTooltipProps["yPosition"] = "top";
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  $: textClass = classNames(
    "whitespace-nowrap",
    "rounded-md",
    colorDefinitions[themeColor][colorSettings.tooltip].bg,
    colorDefinitions[themeColor][colorSettings.tooltip].text,
    "px-2",
    "py-1",
    "absolute",
    xPosition === "left" ? "right-full" : "left-full",
    yPosition === "top" ? "bottom-full" : "top-full",
    "z-10",
    "opacity-0",
    "group-hover:opacity-100",
    "transition",
    "pointer-events-none",
    "shadow-md dark:shadow-none",
    colorDefinitions[themeColor][colorSettings.tooltip].shadow,
    "dark:border",
    colorDefinitions[themeColor][colorSettings.tooltip].border,
    ""
  );
</script>

{#if text}
  <div class={classNames("relative", "group", "flex")}>
    <span class={textClass}>
      {text}
    </span>
    <slot />
  </div>
{:else}
  <slot />
{/if}
