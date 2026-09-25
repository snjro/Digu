<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { type ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import classNames from "classnames";
  import BaseButtonIcon from "../BaseButtonIcon.svelte";
  import type { BaseIconProps } from "../BaseIcon";
  import BaseLabel, { type BaseLabelProps } from "../BaseLabel.svelte";
  import type { BaseSize } from "../baseSizes";
  import { closeDialog } from "./BaseDialogHandler";

  interface Props {
    dialogElement: HTMLDialogElement | undefined;
    headerIconName?: BaseIconProps["name"] | undefined;
    headerText: string | undefined;
  }

  let {
    dialogElement,
    headerIconName = undefined,
    headerText,
  }: Props = $props();

  const headerSize: BaseSize = sizeSettings.dialogHeader;
  const headerColor: ColorCategory = colorSettings.dialogHeader;
  const prefixIcon: BaseLabelProps["prefixIcon"] = $derived(
    headerIconName
      ? {
          name: headerIconName,
          colorCategory: headerColor,
        }
      : undefined,
  );
</script>

<div
  class={classNames(
    "shrink-0",
    "flex",
    "items-center",
    headerText ? "justify-between" : "justify-end",
    "w-full",
    "p-1.5",
    colorClasses[headerColor].bg,
    "relative",
    "border-b",
    colorClasses[headerColor].border,
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
    ariaLabel="Close"
    colorCategoryFront={headerColor}
    colorCategoryBg={headerColor}
    tooltipXPosition="left"
    tooltipYPosition="bottom"
    onclick={() => closeDialog(dialogElement)}
  />
</div>
