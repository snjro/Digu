<script lang="ts">
  import { colorClasses } from "#lib/appearanceConfig/color/colorVariables.js";
  import { type ColorCategory } from "#lib/appearanceConfig/color/colorDefinitions.js";
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
