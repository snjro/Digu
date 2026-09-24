<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import { buttonHeight, type BaseSize } from "./baseSizes";

  interface Props {
    size: BaseSize;
    colorCategory: ColorCategory;
    hidden?: boolean;
  }

  let { size, colorCategory, hidden = false }: Props = $props();
  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);
</script>

<div
  {hidden}
  class={classNames(
    buttonHeight[size],
    "w-0",
    "border-r",
    colorDefinitions[themeColor][colorCategory].border,
  )}
></div>
