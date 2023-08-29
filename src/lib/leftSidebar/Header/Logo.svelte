<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseA from "$lib/base/BaseA.svelte";
  import classNames from "classnames";
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
