<script lang="ts">
  import classNames from "classnames";
  import { closeDialog, type BaseDialogProps } from "./BaseDialog.svelte";
  import BaseLabel from "../BaseLabel.svelte";
  import BaseButtonIcon from "../BaseButtonIcon.svelte";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
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
  const prefixIcon: BaseLabel["prefixIcon"] = headerIconName
    ? {
        name: headerIconName,
        colorCategory: colorSettings.dialogHeader,
      }
    : undefined;
</script>

<div
  class={classNames(
    "flex",
    "flex-shrink-0",
    "items-center",
    headerText ? "justify-between" : "justify-end",
    headerText && "space-x-10",
    "w-full",
    "p-1.5",
    colorDefinitions[themeColor][colorSettings.dialogHeader].bg,
    "relative",
    // "rounded-t-lg",
    "border-b",
    colorDefinitions[themeColor][colorSettings.dialogHeader].border,
    ""
  )}
>
  {#if headerText}
    <BaseLabel
      {prefixIcon}
      text={headerText}
      textSize={headerSize}
      colorCategoryFront={colorSettings.dialogHeader}
    />
  {/if}
  <BaseButtonIcon
    size={headerSize}
    iconName="close"
    colorCategoryFront={colorSettings.dialogHeader}
    colorCategoryBg={colorSettings.dialogHeader}
    tooltipXPosition="left"
    tooltipYPosition="bottom"
    on:click={() => closeDialog(dialogElement)}
  />
</div>
<!-- </div> -->
