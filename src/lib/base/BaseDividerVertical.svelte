<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { type ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import classNames from "classnames";
  import { buttonHeight, type BaseSize } from "./baseSizes";

  interface Props {
    size: BaseSize;
    colorCategory: ColorCategory;
    hidden?: boolean;
  }

  let { size, colorCategory, hidden = false }: Props = $props();
</script>

<div
  {hidden}
  class={classNames(
    buttonHeight[size],
    "w-0",
    "border-r",
    colorClasses[colorCategory].border,
  )}
></div>
