<script lang="ts" module>
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
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import type { BaseSnackbarProps } from "$lib/base/snackbarProps";
  import type { BaseSize } from "$lib/base/baseSizes";
  import { storeNoDbSnackBar } from "@stores/storeNoDb";

  interface Props {
    copyTarget?: string | undefined;
    size: BaseSize;
    colorCategory?: ColorCategory | undefined;
    showTooltip?: boolean;
  }

  let {
    copyTarget = undefined,
    size,
    colorCategory = colorSettings.main,
    showTooltip = false,
  }: Props = $props();
  async function copyToClipBoard(): Promise<void> {
    await navigator.clipboard.writeText(copyTarget ?? "");
    $storeNoDbSnackBar = showSnackBarAsCopied;
  }

  const tooltipText = (): string | undefined => {
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
  onclick={() => {
    copyToClipBoard();
  }}
/>
