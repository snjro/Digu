<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { type ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import classNames from "classnames";

  interface Props {
    isSelected?: boolean;
    isHover?: boolean;
    isUpdated?: boolean;
    invisible?: boolean;
    isTopLevelItem: boolean;
  }

  let {
    isSelected = false,
    isHover = false,
    isUpdated = false,
    invisible = false,
    isTopLevelItem,
  }: Props = $props();

  let colorCategory: ColorCategory = $derived(
    isSelected ? "interactive" : colorSettings.dialogHeader,
  );
  // $: colorCategory = getFrontColorCategory(isSelected);

  let bgColor = $derived(
    isHover
      ? colorClasses[colorCategory].bgEmphasis
      : colorClasses[colorCategory].bg,
  );

  let height: `h-${string}` | "self-stretch" = $derived.by(() => {
    if (isSelected) {
      return "h-4/6";
    } else if (isUpdated) {
      return "h-1/3";
    } else if (isHover) {
      return "h-4/5";
    } else {
      return "self-stretch";
    }
  });
  let left: `pl-${string}` = $derived.by(() => {
    return isTopLevelItem ? "pl-0.5" : "pl-1.5";
  });
  let center: string = $derived.by(() => {
    if (isSelected) {
      return "w-[4px] rounded-br-full rounded-tr-full";
    } else if (isUpdated) {
      return "w-[6px] rounded-br-full rounded-tr-full";
    } else if (isHover) {
      return "w-[2px] rounded-none";
    } else {
      return classNames("w-px rounded-none", invisible && "invisible");
    }
  });
  let right: `pr-${string}` = $derived.by(() => {
    if (isSelected) {
      return "pr-[4px]";
    } else if (isUpdated) {
      return "pr-[2px]";
    } else if (isHover) {
      return "pr-[6px]";
    } else {
      return "pr-[7px]";
    }
  });
</script>

<div class={classNames("flex flex-row", "w-fit", height)}>
  <div class={classNames(left)}></div>
  <div class={classNames(bgColor, center)}></div>
  <div class={classNames(right)}></div>
</div>
