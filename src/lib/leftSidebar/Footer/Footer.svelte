<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import classNames from "classnames";
  import FooterButtons from "./FooterButtons.svelte";
  import FooterVersion from "./FooterVersion.svelte";
</script>

<div
  class={classNames(
    "pt-1",
    "pb-2",
    "flex-none",
    "sticky",
    "bottom-0",
    "w-full",
    colorClasses[colorSettings.leftSidebarFooter].bg,
    "border-t",
    colorClasses[colorSettings.leftSidebarFooter].border,
    "",
  )}
>
  <div class={classNames("flex", "h-full", "w-full", "justify-evenly", "")}>
    <FooterButtons />
    <FooterVersion />
  </div>
</div>
