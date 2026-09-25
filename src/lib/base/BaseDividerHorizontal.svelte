<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { type ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import classNames from "classnames";

  interface Props {
    colorCategory: ColorCategory;
    hidden?: boolean;
  }

  let { colorCategory, hidden = false }: Props = $props();
</script>

<div
  {hidden}
  class={classNames(
    "h-[1px]",
    "w-full",
    "border-t",
    colorClasses[colorCategory].border,
  )}
></div>
