<script lang="ts" context="module">
  export type BaseSnackbarProps = {
    visible: boolean;
    text?: string;
    iconProps?: BaseIconProps;
    displayTimeInMilliseconds?: number;
  };
</script>

<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import BaseLabel from "./BaseLabel.svelte";
  import { fly } from "svelte/transition";
  import { expoInOut } from "svelte/easing";
  import type { BaseIconProps } from "./BaseIcon";
  import {
    storeNoDbSnackBar,
    storeNoDbSnackBarInitialValue,
  } from "@stores/storeNoDb";
  import type { BaseSize } from "./baseSizes";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  const displayTimeInMilliseconds: number = 1000;

  $: (async () => {
    if ($storeNoDbSnackBar.visible) {
      if ($storeNoDbSnackBar.iconProps) {
        $storeNoDbSnackBar.iconProps.size = textSize;
      }
      await setTimeout(() => {
        $storeNoDbSnackBar = { ...storeNoDbSnackBarInitialValue };
      }, $storeNoDbSnackBar.displayTimeInMilliseconds ?? displayTimeInMilliseconds);
    }
  })();

  let frameLineStyle: string;
  $: frameLineStyle = classNames(
    themeColor === "light"
      ? classNames(
          "shadow-md",
          colorDefinitions[themeColor][colorSettings.snackBarBg].shadow
        )
      : classNames(
          "border",
          colorDefinitions[themeColor][colorSettings.snackBarBg].border
        )
  );

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  const positionStyle: string = classNames(
    "fixed",
    "bottom-3",
    "right-6",
    "z-50"
  );
  const textSize: BaseSize = "xl";
</script>

{#if $storeNoDbSnackBar.visible}
  <div
    transition:fly={{
      delay: 0,
      duration: 150,
      x: 100,
      y: 0,
      opacity: 0.5,
      easing: expoInOut,
    }}
    class={classNames(
      positionStyle,
      "p-4",
      "rounded",
      frameLineStyle,
      colorDefinitions[themeColor][colorSettings.snackBarBg].bg
    )}
  >
    <BaseLabel
      text={$storeNoDbSnackBar.text}
      colorCategoryFront={colorSettings.snackBarFront}
      {textSize}
      prefixIcon={$storeNoDbSnackBar.iconProps}
    />
  </div>
{/if}
