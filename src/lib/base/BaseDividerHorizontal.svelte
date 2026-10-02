<script lang="ts">
  import { colorClasses } from "#lib/appearanceConfig/color/colorVariables.js";
  import { type ColorCategory } from "#lib/appearanceConfig/color/colorDefinitions.js";
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
