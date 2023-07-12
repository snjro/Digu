<script lang="ts" context="module">
  export const showSnackBarAsCopied: BaseSnackbarProps = {
    visible: true,
    iconProps: {
      name: "checkBold",
      colorCategory: "success",
    },
    text: "Copied",
  };
</script>

<script lang="ts">
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import type { BaseSnackbarProps } from "$lib/base/BaseSnackbar.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import { storeNoDbSnackBar } from "@stores/storeNoDb";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let copyTarget: string | undefined = undefined;
  export let size: BaseSize;
  export let colorCategory: ColorCategory | undefined = colorSettings.main;
  export let showTooltip: boolean = false;
  async function copyToClipBoard(): Promise<void> {
    if (!copyTarget) {
      copyTarget = "";
    }
    await navigator.clipboard.writeText(copyTarget);
    $storeNoDbSnackBar = showSnackBarAsCopied;
  }

  $: tooltipText = (): string | undefined => {
    if (showTooltip) {
      if ($storeNoDbSnackBar.visible) {
        return "copied!";
      } else {
        return "copy";
      }
    } else {
      return undefined;
    }
  };
</script>

<BaseButtonIcon
  tooltipText={tooltipText()}
  iconName="contentCopy"
  {size}
  shadowEffect
  hoverEffect
  colorCategoryFront={colorCategory}
  colorCategoryBg={colorCategory}
  on:click={() => {
    copyToClipBoard();
  }}
/>
