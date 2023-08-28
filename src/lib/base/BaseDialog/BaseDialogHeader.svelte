<script lang="ts">
  import classNames from "classnames";
  import { closeDialog, type BaseDialogProps } from "./BaseDialog.svelte";
  import BaseLabel from "../BaseLabel.svelte";
  import BaseButtonIcon from "../BaseButtonIcon.svelte";
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { BaseSize } from "../baseSizes";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let dialogElement: NonNullable<BaseDialogProps["dialogElement"]>;
  export let headerIconName: BaseDialogProps["headerIconName"] = undefined;
  export let headerText: BaseDialogProps["headerText"];

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
    ""
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
