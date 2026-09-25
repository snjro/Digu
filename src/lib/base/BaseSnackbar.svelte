<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { zIndex } from "$lib/appearanceConfig/zIndex";
  import type { ThemeColor } from "@db/dbTypes";
  import {
    storeNoDbSnackBar,
    storeNoDbSnackBarInitialValue,
  } from "@stores/storeNoDb";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import { expoInOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import BaseLabel from "./BaseLabel.svelte";
  import type { BaseSize } from "./baseSizes";

  const displayTimeInMilliseconds: number = 1000;

  $effect.pre(() => {
    if (!$storeNoDbSnackBar.visible) return;
    const timer = setTimeout(() => {
      $storeNoDbSnackBar = { ...storeNoDbSnackBarInitialValue };
    }, $storeNoDbSnackBar.displayTimeInMilliseconds ?? displayTimeInMilliseconds);
    // A new snackbar starts its own time, so the earlier timer must not hide it.
    return () => clearTimeout(timer);
  });

  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  let frameLineStyle: string = $derived(
    classNames(
      themeColor === "light"
        ? classNames("shadow-md", colorClasses[colorSettings.snackBarBg].shadow)
        : classNames("border", colorClasses[colorSettings.snackBarBg].border),
    ),
  );

  const positionStyle: string = classNames(
    "fixed",
    "bottom-3",
    "right-6",
    zIndex.snackbar,
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
      "rounded-sm",
      frameLineStyle,
      colorClasses[colorSettings.snackBarBg].bg,
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
