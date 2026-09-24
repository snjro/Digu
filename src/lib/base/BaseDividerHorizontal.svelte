<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";

  interface Props {
    colorCategory: ColorCategory;
    hidden?: boolean;
  }

  let { colorCategory, hidden = false }: Props = $props();
  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);
</script>

<div
  {hidden}
  class={classNames(
    "h-[1px]",
    "w-full",
    "border-t",
    colorDefinitions[themeColor][colorCategory].border,
  )}
></div>
