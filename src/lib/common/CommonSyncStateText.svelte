<script lang="ts" module>
  export type SyncStateTextLabelProps = {
    colorCategoryFront: ColorCategory;
    size: BaseSize;
    syncStateText: SyncStateText;
    showIcon: boolean;
  };

  export function iconNameForSyncStateText(
    syncStateText: SyncStateText,
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

  interface Props {
    showIcon?: SyncStateTextLabelProps["showIcon"];
    colorCategoryFront: SyncStateTextLabelProps["colorCategoryFront"];
    size: SyncStateTextLabelProps["size"];
    syncStateText: SyncStateTextLabelProps["syncStateText"];
  }

  let {
    showIcon = true,
    colorCategoryFront,
    size,
    syncStateText,
  }: Props = $props();

  let animatePulse: "animate-pulse" | undefined = $derived(
    syncStateText === "stopping" ? "animate-pulse" : undefined,
  );
  let animateSpin: "animate-spin" | undefined = $derived(
    syncStateText === "syncing" ? "animate-spin" : undefined,
  );

  let prefixIcon: BaseIconProps | undefined = $derived(
    showIcon
      ? {
          name: iconNameForSyncStateText(syncStateText),
          appendClass: classNames(animateSpin, animatePulse),
        }
      : undefined,
  );
</script>

<BaseLabel
  text={syncStateText}
  {colorCategoryFront}
  textSize={size}
  {prefixIcon}
  appendClass={animatePulse}
/>
