<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import FooterButtons from "./FooterButtons.svelte";
  import FooterVersion from "./FooterVersion.svelte";

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;
</script>

<div
  class={classNames(
    "pt-1",
    "pb-2",
    "flex-none",
    "sticky",
    "bottom-0",
    "w-full",
    colorDefinitions[themeColor][colorSettings.leftSidebarFooter].bg,
    "border-t",
    colorDefinitions[themeColor][colorSettings.leftSidebarFooter].border,
    "",
  )}
>
  <div class={classNames("flex", "h-full", "w-full", "justify-evenly", "")}>
    <FooterButtons />
    <FooterVersion />
  </div>
</div>
