<script lang="ts">
  import BaseA from "$lib/base/BaseA.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import classNames from "classnames";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
</script>

<BaseA
  href={"/"}
  text="Contract Viewer"
  appendClass={classNames("font-medium")}
  textSize={sizeSettings.leftSidebarLogo}
  colorCategory={colorSettings.leftSidebarHeader}
  hoverEffect={false}
  openNewTab={false}
/>
