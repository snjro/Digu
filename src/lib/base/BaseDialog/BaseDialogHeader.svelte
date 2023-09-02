<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import BaseButtonIcon from "../BaseButtonIcon.svelte";
  import type { BaseIconProps } from "../BaseIcon";
  import BaseLabel from "../BaseLabel.svelte";
  import type { BaseSize } from "../baseSizes";
  import { closeDialog } from "./BaseDialogHandler";

  export let dialogElement: HTMLDialogElement;
  export let headerIconName: BaseIconProps["name"] | undefined = undefined;
  export let headerText: string | undefined;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  const headerSize: BaseSize = sizeSettings.dialogHeader;
  const headerColor: ColorCategory = colorSettings.dialogHeader;
  const prefixIcon: BaseLabel["prefixIcon"] = headerIconName
    ? {
        name: headerIconName,
        colorCategory: headerColor,
      }
    : undefined;
</script>

<div
  class={classNames(
    "shrink-0",
    "flex",
    "items-center",
    headerText ? "justify-between" : "justify-end",
    "w-full",
    "p-1.5",
    colorDefinitions[themeColor][headerColor].bg,
    "relative",
    "border-b",
    colorDefinitions[themeColor][headerColor].border,
    "",
  )}
>
  {#if headerText}
    <BaseLabel
      {prefixIcon}
      text={headerText}
      textSize={headerSize}
      colorCategoryFront={headerColor}
    />
  {/if}
  <BaseButtonIcon
    size={headerSize}
    iconName="close"
    colorCategoryFront={headerColor}
    colorCategoryBg={headerColor}
    tooltipXPosition="left"
    tooltipYPosition="bottom"
    on:click={() => closeDialog(dialogElement)}
  />
</div>
