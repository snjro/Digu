<script lang="ts">
  import { base } from "$app/paths";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseA from "$lib/base/BaseA.svelte";
  import { capitalizeFirstLetter } from "@utils/utilsCommon";
  import { PROJECT_NAME } from "@utils/utilsConstants";
  import classNames from "classnames";
</script>

<BaseA
  href={`${base}/`}
  text={capitalizeFirstLetter(PROJECT_NAME)}
  appendClass={classNames("font-medium")}
  textSize={sizeSettings.leftSidebarLogo}
  colorCategory={colorSettings.leftSidebarHeader}
  hoverEffect={false}
  openNewTab={false}
/>
