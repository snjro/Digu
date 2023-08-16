<script lang="ts" context="module">
  export type SyncStateTextLabelProps = {
    colorCategoryFront: ColorCategory;
    size: BaseSize;
    syncStateText: SyncStateText;
    showIcon: boolean;
  };

  export function iconNameForSyncStateText(
    syncStateText: SyncStateText
  ): BaseIconProps["name"] {
    if (syncStateText === "stopping" || syncStateText === "syncing") {
      return "sync";
    } else {
      return "pause";
    }
  }
</script>

<script lang="ts">
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type { SyncStateText } from "@db/dbTypes";
  import classNames from "classnames";

  export let showIcon: SyncStateTextLabelProps["showIcon"] = true;
  export let colorCategoryFront: SyncStateTextLabelProps["colorCategoryFront"];
  export let size: SyncStateTextLabelProps["size"];
  export let syncStateText: SyncStateTextLabelProps["syncStateText"];

  let animatePulse: "animate-pulse" | undefined = undefined;
  $: animatePulse = syncStateText === "stopping" ? "animate-pulse" : undefined;
  let animateSpin: "animate-spin" | undefined = undefined;
  $: animateSpin = syncStateText === "syncing" ? "animate-spin" : undefined;

  let prefixIcon: BaseIconProps | undefined;
  $: prefixIcon = showIcon
    ? {
        name: iconNameForSyncStateText(syncStateText),
        appendClass: classNames(animateSpin, animatePulse),
      }
    : undefined;
</script>

<BaseLabel
  text={syncStateText}
  {colorCategoryFront}
  textSize={size}
  {prefixIcon}
  appendClass={animatePulse}
/>
