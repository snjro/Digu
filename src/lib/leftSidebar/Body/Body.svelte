<script lang="ts">
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { breakPointWidths } from "@utils/utilsDom";
  import classNames from "classnames";
  import ItemHome from "./ItemHome.svelte";
  import ItemProjectVersion from "./ItemProjectVersion.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let isHoverOnLeftSidebar: boolean;

  $: scrollbarHidden = classNames(
    $storeNoDbCurrentWidth < breakPointWidths.sm
      ? "overflow-y-scroll"
      : isHoverOnLeftSidebar
      ? "overflow-y-scroll"
      : "overflow-y-hidden"
  );
  $: scrollStyle = classNames("scroll-smooth", scrollbarHidden, "pr-3");
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<div
  id="leftSidebarBody"
  class={classNames(
    scrollStyle,
    "w-full",
    "flex",
    "flex-col",
    "flex-grow",
    "py-2",
    !isHoverOnLeftSidebar && "pr-[27px]",
    colorDefinitions[themeColor][colorSettings.leftSidebarBodyBg].bg,
    ""
  )}
>
  <ItemHome />
  <ItemProjectVersion />
</div>
