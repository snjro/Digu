<script lang="ts">
  import type { ColorCategory } from "#lib/appearanceConfig/color/colorDefinitions.js";
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import BaseButtonIcon from "#lib/base/BaseButtonIcon.svelte";
  import type { BaseSize } from "#lib/base/baseSizes.js";
  import { copyTextToClipboard } from "#lib/common/clipboard.js";
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
    $storeNoDbSnackBar = await copyTextToClipboard(copyTarget ?? "");
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
  ariaLabel="Copy"
  iconName="contentCopy"
  {size}
  shadowEffect
  hoverEffect
  colorCategoryFront={colorCategory}
  colorCategoryBg={colorCategory}
  onclick={() => {
    void copyToClipBoard();
  }}
/>
